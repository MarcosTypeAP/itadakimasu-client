import { FontAwesome6 } from '@expo/vector-icons'
import { Image } from 'expo-image'
import React from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { API_SEARCH_VIDEO_PATH, Colors } from './globals'
import { getAppSettings } from './Settings'

export type VideoInfo = {
    videoId: string
    watchUrl: string
    title: string
    author: string
    thumbnailUrl: string
}

export function useSearchVideos(): [boolean, VideoInfo[], (text: string) => Promise<void>] {
    const [searchResults, setSearchResults] = React.useState<VideoInfo[]>([])
    const [isLoading, setIsLoading] = React.useState(false)

    async function handleSearch(text: string): Promise<void> {
        if (text.length === 0) {
            return
        }

        const appSettings = await getAppSettings()

        if (appSettings.serverURL === null) {
            alert('The server URL is not set. Go to settings to configure it.')
            return 
        }

        setIsLoading(true)
        const response = await fetch(appSettings.serverURL + API_SEARCH_VIDEO_PATH + '?query=' + encodeURIComponent(text.trim()))
            .catch(function(error: TypeError) {
                alert('Error fetching.')
                throw error
            })
        setIsLoading(false)

        const data: VideoInfo[] = await response.json()
        setSearchResults(data)
    }

    return [isLoading, searchResults, handleSearch]
}

type SearchBarProps = {
    onSubmitText: (text: string) => void
}

export function SearchBar({onSubmitText}: SearchBarProps) {
    const [searchText, setSearchText] = React.useState('')

    return (
        <View style={styles.search_bar}>
            <FontAwesome6 name='magnifying-glass' size={18} color={Colors.fg2} />
            <TextInput
                style={styles.search_bar_input}
                placeholder='Search'
                placeholderTextColor={Colors.fg2}
                enterKeyHint='search'
                onChangeText={setSearchText}
                onSubmitEditing={(event) => onSubmitText(event.nativeEvent.text.trim())}
                value={searchText}
            />
        </View>
    )
}

type SearchResultProps = {
    videoInfo: VideoInfo
    onPress: (videoInfo: VideoInfo) => void
}

export function SearchResult({videoInfo, onPress}: SearchResultProps) {
    return (
        <View style={styles.search_result}>
            <Text style={styles.search_result_title} numberOfLines={1}>{videoInfo.title}</Text>
            <Pressable onPress={() => onPress(videoInfo)}>
                <Image
                    style={styles.search_result_thumbnail}
                    source={videoInfo.thumbnailUrl}
                    cachePolicy='disk'
                    placeholder='8AC%8K~qt7xtj]ofj[ofoL'
                />
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    search_bar: {
        backgroundColor: Colors.bg2,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        paddingHorizontal: 20,
        borderRadius: 100,
    },
    search_bar_input: {
        flex: 1,
        marginLeft: 15,
        fontSize: 20,
        color: Colors.fg1,
    },
    search_result: {
        flex: 1,
        marginBottom: 30,
        padding: 10,
        alignItems: 'center',
        backgroundColor: Colors.bg2,
        borderRadius: 30,
    },
    search_result_title: {
        color: Colors.fg1,
        fontSize: 20,
        paddingHorizontal: 5,
    },
    search_result_thumbnail: {
        marginTop: 10,
        borderRadius: 20,
        aspectRatio: '16/9',
        width: '100%',
    },
})
