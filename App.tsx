import { MaterialIcons } from '@expo/vector-icons'
import 'expo-dev-client'
import * as FileSystem from 'expo-file-system'
import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { API_DOWNLOAD_PATH, Colors } from './src/globals'
import { SearchBar, SearchResult, VideoInfo, useSearchVideos } from './src/Search'
import { SettingsModal, getAppSettings, updateAppSettings } from './src/Settings'
import Spinner from './src/Spinner'
import { TrackMetadata, VideoModal } from './src/VideoModal'

async function readBlobAsBase64(blob: Blob): Promise<string> {
    return await new Promise(function(resolve, reject) {
        const reader = new FileReader()
        reader.onload = function() {
            if (typeof reader.result === 'string') {
                // remove "data:*/*;base64,"
                resolve(reader.result.split(',', 2)[1])
            }
            reject('Could not encode blob as base64.')
        }
        reader.onerror = function() {
            reject('Could not encode blob as base64.')
        }
        reader.readAsDataURL(blob)
    })
}

type UseDownloadTrackReturnValue = {
    downloadTrack: (
        videoInfo: VideoInfo,
        trackMetadata: TrackMetadata
    ) => Promise<{fileURI: string | undefined, aborted: boolean}>,
    abortTrackDownload: (reason?: string) => void
}

function useDownloadTrack(): UseDownloadTrackReturnValue {
    let controller: AbortController | undefined = undefined

    const abortTrackDownload: UseDownloadTrackReturnValue['abortTrackDownload'] = function(reason) {
        if (controller) {
            controller.abort(reason)
        }
    }

    const downloadTrack: UseDownloadTrackReturnValue['downloadTrack'] = async function(videoInfo, trackMetadata) {
        const appSettings = await getAppSettings()

        if (appSettings.serverURL === null) {
            alert('The server URL is not set. Go to settings to configure it.')
            return {
                fileURI: undefined,
                aborted: false
            }
        }

        try {
            if (!appSettings.downloadsURI) {
                throw new Error()
            }

            await FileSystem.StorageAccessFramework.readDirectoryAsync(appSettings.downloadsURI)
        } catch {
            const uriPermission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync() 

            if (!uriPermission.granted) {
                appSettings.downloadsURI = null
                await updateAppSettings(appSettings)
                return {
                    fileURI: undefined,
                    aborted: false
                }
            }

            appSettings.downloadsURI = uriPermission.directoryUri
        }

        updateAppSettings(appSettings)
            .catch((error) => console.error('Could not update app settings: %s', error))

        const queryParams = Object.entries({
            title: trackMetadata.title,
            artist: trackMetadata.artist,
            album: trackMetadata.album,
            album_cover_url: trackMetadata.albumCoverUrl
        })
            .map(([key, value]) => key + '=' + encodeURIComponent(value))
            .join('&')

        const url = appSettings.serverURL + API_DOWNLOAD_PATH + `?video_id=${videoInfo.videoId}&${queryParams}`

        let response: Response
        try {
            controller = new AbortController()
            response = await fetch(url, {signal: controller.signal})
        } catch(error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('Track download aborted.')
                return {
                    fileURI: undefined,
                    aborted: true
                }
            }
            alert('Error fetching.')
            throw error
        }

        if (response.status !== 200) {
            console.error('Could not download the track. HTTP status code: %s', response.status)
            return {
                fileURI: undefined,
                aborted: false
            }
        }

        const trackContent = await readBlobAsBase64(await response.blob())

        const trackFilename = `${trackMetadata.title || videoInfo.title}.mp3`
        const newFileURI = await FileSystem.StorageAccessFramework.createFileAsync(appSettings.downloadsURI, trackFilename, 'audio/mpeg')

        await FileSystem.writeAsStringAsync(newFileURI, trackContent, {encoding: FileSystem.EncodingType.Base64})

        return {
            fileURI: newFileURI,
            aborted: false
        }
    }

    return {downloadTrack, abortTrackDownload}
}

export default function App() {
    const [isLoading, searchResults, searchVideos] = useSearchVideos()
    const [selectedVideo, setSelectedVideo] = React.useState<VideoInfo>()
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)

    const {downloadTrack, abortTrackDownload} = useDownloadTrack()

    /** @returns Whether the track was downloaded or not. */
    const handleDownload = React.useCallback(async function(videoInfo: VideoInfo, trackMetadata: TrackMetadata): Promise<boolean> {
        const response = await downloadTrack(videoInfo, trackMetadata)

        if (response.aborted) {
            return false
        }

        if (!response.fileURI) {
            alert('Could not download the track.')
            return false
        }

        return true
    }, [])
    
    const handleOnCloseVideoModal = React.useCallback(async function() {
        setSelectedVideo(undefined)
        abortTrackDownload()
    }, [])

    return <>
        <SafeAreaView style={styles.main}>
            <View style={styles.header}>
                <SearchBar onSubmitText={searchVideos} />
                <Pressable onPress={function() {setIsSettingsOpen(true)}}>
                    <MaterialIcons style={styles.header_settings} name="settings" size={30} color={Colors.fg2} />
                </Pressable>
            </View>
            <ScrollView style={styles.search_results}>
                {searchResults.length > 0 && !isLoading &&
                    searchResults.map((result) => <SearchResult key={result.videoId} videoInfo={result} onPress={setSelectedVideo} />)
                }
                {searchResults.length === 0 && !isLoading &&
                    <Text style={styles.no_results}>Start searching to see results</Text>
                }
                <Spinner style={styles.no_results} display={isLoading} />
            </ScrollView>
        </SafeAreaView>
        {selectedVideo &&
            <VideoModal selectedVideo={selectedVideo} onRequestClose={handleOnCloseVideoModal} onDownload={handleDownload} />
        }
        {isSettingsOpen &&
            <SettingsModal onRequestClose={function() {setIsSettingsOpen(false)}} />
        }
        <StatusBar />
    </>
}

const styles = StyleSheet.create({
    main: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.bg1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 50,
        marginBottom: 20,
    },
    header_settings: {
        marginLeft: 15,
    },
    search_results: {
        flex: 1,
        width: '90%',
        borderTopRightRadius: 10,
        borderTopLeftRadius: 10,
        paddingTop: 10,
    },
    no_results: {
        fontSize: 24,
        color: Colors.fg3,
        marginLeft: 'auto',
        marginRight: 'auto',
        marginTop: 40,
    }
})
