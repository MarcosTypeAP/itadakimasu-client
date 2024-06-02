import { FontAwesome6, MaterialIcons, Octicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import React from 'react'
import { Keyboard, LayoutChangeEvent, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { Easing, WithTimingConfig, useSharedValue, withTiming } from 'react-native-reanimated'
import { Checkbox } from './Checkbox'
import { DarkBackground } from './DarkBackground'
import { API_SEARCH_TRACK_PATH, Colors } from './globals'
import ProgressButton from './ProgressButton'
import { VideoInfo } from './Search'
import { ArtistPattern, getAppSettings } from './Settings'

const TRACK_COVER_MARGIN_RIGHT_PERCENTAGE = 40

export type TrackMetadata = {
    title: string
    artist: string
    album: string
    albumCoverUrl: string
}

function getTrackTitleAndArtist(videoInfo: VideoInfo, knownArtistPatterns: ArtistPattern[]): [string, string] {
    let trackTitle = ''
    let trackArtist = ''

    let videoTitle = videoInfo.title

    for (const pattern of knownArtistPatterns) {
        const regex = new RegExp(pattern.regex, pattern.caseInsensitive ? 'i' : undefined)
        const artistMatchInVideoAuthor = videoInfo.author.match(regex)
        const artistMatchInVideoTitle = videoTitle.match(regex)

        if (artistMatchInVideoTitle) {
            videoTitle = (
                videoTitle.slice(0, artistMatchInVideoTitle.index!) +
                videoTitle.slice(artistMatchInVideoTitle.index! + artistMatchInVideoTitle[0].length)
            )
        }

        if (artistMatchInVideoAuthor || artistMatchInVideoTitle) {
            trackArtist = pattern.artist
            break
        }
    }

    if (trackArtist !== '') {
        const titleMatch = videoTitle.match(/\w[\w\s,.]*/)

        if (titleMatch) {
            trackTitle = titleMatch[0].trim()
            trackTitle = trackTitle[0].toUpperCase() + trackTitle.slice(1)
        }
    }

    return [trackTitle, trackArtist]
}

const metadataCache: {[key: string]: TrackMetadata[]} = {}

async function searchTrackMetadata(metadata: TrackMetadata): Promise<TrackMetadata[]> {
    const cacheKey = (metadata.title + metadata.artist + metadata.album).toUpperCase()

    if (metadataCache[cacheKey]) {
        return metadataCache[cacheKey]
    }

    const appSettings = await getAppSettings()

    const url = appSettings.serverURL + API_SEARCH_TRACK_PATH
        + `?title=${encodeURIComponent(metadata.title)}&artist=${encodeURIComponent(metadata.artist)}`
        + (metadata.album ? `&album=${encodeURIComponent(metadata.album)}` : '')

    const response = await fetch(url)
        .catch(function(error) {
            alert('Error fetching.')
            throw error
        })

    if (response.status !== 200) {
        const msg = `Could not fetch the track metadata. HTTP code: ${response.status}`
        console.error(msg)
        throw new Error(msg)
    }

    const data = await response.json()

    const trackMetadataList: TrackMetadata[] = []

    try {
        if (!Array.isArray(data)) {
            throw new Error()
        }

        Object.values(data).forEach(function(metadata) {
            const trackMetadata: TrackMetadata = {
                title: metadata.title,
                artist: metadata.artist,
                album: metadata.album,
                albumCoverUrl: metadata.albumCoverUrl
            }

            Object.values(trackMetadata).forEach(function(value) {
                if (value === undefined) {
                    throw new Error()
                }
            })

            trackMetadataList.push(trackMetadata)
        })
    } catch {
        const msg = 'Unexpected format for the response body.'
        console.error(msg)
        throw new Error(msg)
    }

    metadataCache[cacheKey] = trackMetadataList
    return trackMetadataList
}

const imagesTimingConfig: WithTimingConfig = {
    duration: 300,
    easing: Easing.inOut(Easing.sin)
}

type IsInputManualEdit = Record<keyof Pick<TrackMetadata, 'title' | 'artist' | 'album'>, boolean>

type VideoMenuProps = {
    selectedVideo: VideoInfo
    onRequestClose: () => void
    onDownload: (videoInfo: VideoInfo, metadata: TrackMetadata) => Promise<boolean>
}

export function VideoModal({selectedVideo, onRequestClose, onDownload}: VideoMenuProps) {
    const [trackMetadata, setTrackMetadata] = React.useState<TrackMetadata>({
        title: selectedVideo.title,
        artist: selectedVideo.author,
        album: '',
        albumCoverUrl: selectedVideo.thumbnailUrl
    })

    const [isInputManualEdit, setIsInputManualEdit] = React.useState<IsInputManualEdit>({
        title: false,
        artist: false,
        album: false
    })

    const [trackMetadataList, setTrackMetadataList] = React.useState<TrackMetadata[]>([trackMetadata])
    const [selectedMetadataOptionIndex, setSelectedMetadataOptionIndex] = React.useState(0)

    const imagesOffset = useSharedValue(0)

    const modalBottom = useSharedValue(0)
    const [modalHeight, setModalHeight] = React.useState(0)
    const [lowestInputPosY, setLowestPosY] = React.useState(0)

    const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false)

    React.useEffect(function() {
        if (isKeyboardVisible) {
            modalBottom.value = withTiming(-(modalHeight - lowestInputPosY) + 40, {duration: 100})
        } else {
            modalBottom.value = withTiming(0, {duration: 100})
        }
    }, [isKeyboardVisible, lowestInputPosY, modalHeight])

    React.useEffect(function() {
        getAppSettings()
            .then(function(appSettings) {
                const titleAndArtist = getTrackTitleAndArtist(selectedVideo, appSettings.knownArtistPatterns)
                const newMetadata: TrackMetadata = {
                    title: titleAndArtist[0] || trackMetadata.title,
                    artist: titleAndArtist[1] || trackMetadata.artist,
                    album: '',
                    albumCoverUrl: selectedVideo.thumbnailUrl
                }
                setTrackMetadata(newMetadata)
                setTrackMetadataList([newMetadata])
            })

        modalBottom.value = 0

        const onShow = Keyboard.addListener('keyboardDidShow', function() {
            setIsKeyboardVisible(true)
        })
        const onHide = Keyboard.addListener('keyboardDidHide', function() {
            setIsKeyboardVisible(false)
        })

        return function() {
            onShow.remove()
            onHide.remove()
        }
    }, [])

    function updateMetadata<K extends keyof TrackMetadata>(key: K, value: TrackMetadata[K]): void {
        setTrackMetadata({...trackMetadata, [key]: value})
    }

    function updateIsInputManualEdit(key: keyof IsInputManualEdit, value: boolean): void {
        setIsInputManualEdit({...isInputManualEdit, [key]: value})
    }
    
    async function handleSearchTrackMetadata(): Promise<boolean> {
        if (trackMetadataList.length > 1) {
            return false
        }

        try {
            setTrackMetadataList(trackMetadataList.concat(await searchTrackMetadata(trackMetadata)))
            // @ts-ignore `left` do support percentage strings
            imagesOffset.value = '0%'
            return true
        } catch {
            alert('Could not search metadata for the track.')
            return false
        }
    }

    async function handleStartDownload(): Promise<boolean> {
        if (!trackMetadata.title || !trackMetadata.artist) {
            alert('Title and Artist are required.')
            return false
        }

        return await onDownload(selectedVideo, trackMetadata)
    }

    function updateMetadataFromInputs(offset: 1 | -1) {
        if (offset === -1 && selectedMetadataOptionIndex === 0) {
            return
        }

        if (offset === 1 && selectedMetadataOptionIndex === trackMetadataList.length - 1) {
            return
        }

        const newIndex = selectedMetadataOptionIndex + offset
        setSelectedMetadataOptionIndex(newIndex)

        // @ts-ignore `left` do support percentage strings
        imagesOffset.value = withTiming(`-${(100 + TRACK_COVER_MARGIN_RIGHT_PERCENTAGE) * (newIndex)}%`, imagesTimingConfig)

        const newMetadata: TrackMetadata = {
            title: isInputManualEdit.title ? trackMetadata.title : trackMetadataList[newIndex].title,
            artist: isInputManualEdit.artist ? trackMetadata.artist : trackMetadataList[newIndex].artist,
            album: isInputManualEdit.album ? trackMetadata.album : trackMetadataList[newIndex].album,
            albumCoverUrl: trackMetadataList[newIndex].albumCoverUrl
        }

        setTrackMetadata(newMetadata)
    }

    function handleSetModalHeight(event: LayoutChangeEvent): void {
        setModalHeight(event.nativeEvent.layout.height)
    }

    return (
        <Modal visible animationType='slide' transparent onRequestClose={onRequestClose}>
            <DarkBackground onPress={onRequestClose} />
            <Animated.View style={[styles.main, {bottom: modalBottom}]} onLayout={modalHeight === 0 ? handleSetModalHeight : undefined}>
                <Text style={styles.video_title} numberOfLines={1}>{selectedVideo.title}</Text>

                <View style={styles.cover_selector}>
                    <Pressable
                        style={[styles.cover_selector_arrow, {opacity: selectedMetadataOptionIndex > 0 ? 1 : 0.1}]}
                        onPress={function() {updateMetadataFromInputs(-1)}}
                    >
                        <FontAwesome6 name="caret-left" size={60} color={Colors.fg2} />
                    </Pressable>
                    <View style={styles.cover_selector_images_mask}>
                        <Animated.View style={[styles.cover_selector_images, {left: imagesOffset}]}>
                            {trackMetadataList.map((metadata, index) => 
                                <Image
                                    key={index}
                                    style={styles.cover_selector_image}
                                    source={metadata.albumCoverUrl}
                                    cachePolicy='memory-disk'
                                    placeholder='8AC%8K~qt7xtj]ofj[ofoL'
                                />
                            )}
                        </Animated.View>
                    </View>
                    <Pressable
                        style={[styles.cover_selector_arrow, {opacity: selectedMetadataOptionIndex < trackMetadataList.length - 1 ? 1 : 0.1}]}
                        onPress={function() {updateMetadataFromInputs(1)}}
                    >
                        <FontAwesome6 name="caret-right" size={60} color={Colors.fg2} />
                    </Pressable>
                </View>

                <TrackMetadataInput
                    field='title'
                    metadata={trackMetadata}
                    updateMetadata={updateMetadata}
                    updateIsInputManualEdit={updateIsInputManualEdit}
                    selectedMetadataOption={trackMetadataList[selectedMetadataOptionIndex]}
                    required
                />
                <TrackMetadataInput
                    field='artist'
                    metadata={trackMetadata}
                    updateMetadata={updateMetadata}
                    updateIsInputManualEdit={updateIsInputManualEdit}
                    selectedMetadataOption={trackMetadataList[selectedMetadataOptionIndex]}
                    required
                />
                <TrackMetadataInput
                    field='album'
                    metadata={trackMetadata}
                    updateMetadata={updateMetadata}
                    updateIsInputManualEdit={updateIsInputManualEdit}
                    selectedMetadataOption={trackMetadataList[selectedMetadataOptionIndex]}
                    setInputPosY={setLowestPosY}
                />

                <ProgressButton
                    startText='Search'
                    startIcon={<FontAwesome6 name='magnifying-glass' size={20} color={Colors.fg1} />}
                    startOnPress={handleSearchTrackMetadata}
                    loadingText='Searching...'
                    finishText='Done'
                    finishIcon={<MaterialIcons name="done" size={24} color={Colors.fg1} />}
                />

                <ProgressButton
                    startText='Download'
                    startIcon={<Octicons name="download" size={24} color={Colors.fg1} />}
                    startOnPress={handleStartDownload}
                    loadingText='Downloading...'
                    finishText='Done'
                    finishIcon={<MaterialIcons name="done" size={24} color={Colors.fg1} />}
                    finishOnPress={onRequestClose}
                />
            </Animated.View>
        </Modal>
    )
}

type TrackMetadataInputProps = {
    field: keyof Pick<TrackMetadata, 'title' | 'artist' | 'album'>
    metadata: TrackMetadata
    updateMetadata: <K extends keyof TrackMetadata>(key: K, value: TrackMetadata[K]) => void
    updateIsInputManualEdit: (key: keyof IsInputManualEdit, value: boolean) => void
    selectedMetadataOption: TrackMetadata
    setInputPosY?: React.Dispatch<React.SetStateAction<number>>
    required?: boolean
}

function TrackMetadataInput({
    field,
    metadata,
    updateMetadata,
    updateIsInputManualEdit,
    selectedMetadataOption,
    setInputPosY,
    required = false
}: TrackMetadataInputProps) {
    const [hasFocus, setHasFocus] = React.useState(false)
    const [hasError, setHasError] = React.useState(false)
    const [isManualEdit, setIsManualEdit] = React.useState(false)
    const [hasMeasuredPosition, setHasMeasuredPosition] = React.useState(false)

    const placeholder = field[0].toUpperCase() + field.slice(1)

    const inputColor = isManualEdit
        ? Colors.fg1
        : Colors.bg4

    const placeholderColor = isManualEdit
        ? Colors.fg3
        : Colors.bg4

    const borderColor = hasError
        ? Colors.error
        : hasFocus
            ? Colors.accent1
            : placeholderColor

    const value = metadata[field]

    function handleSetPosY(event: LayoutChangeEvent): void {
        setInputPosY && setInputPosY(event.nativeEvent.layout.y + event.nativeEvent.layout.height)
        setHasMeasuredPosition(true)
    }

    return (
        <View style={styles.track_metadata_field_container} onLayout={!hasMeasuredPosition ? handleSetPosY : undefined}>
            <View style={[styles.track_metadata_field, {borderColor: borderColor}]}>
                <Text style={[styles.track_metadata_input_floating_placeholder, {color: borderColor}]}>{placeholder}</Text>
                <TextInput
                    style={[styles.track_metadata_input, {color: inputColor}]}
                    editable={isManualEdit}
                    placeholder={placeholder}
                    placeholderTextColor={placeholderColor}
                    value={value}
                    onChangeText={function(text) {
                        updateMetadata(field, text)
                        setHasError(false)
                    }}
                    onFocus={function() {
                        setHasFocus(true)
                    }}
                    onBlur={function() {
                        setHasFocus(false)
                        updateMetadata(field, value.trim())

                        if (required) {
                            setHasError(value.length === 0)
                        }
                    }}
                />
            </View>
            <Checkbox value={isManualEdit} onPress={function() {
                setIsManualEdit(!isManualEdit)
                updateIsInputManualEdit(field, !isManualEdit)
                updateMetadata(field, selectedMetadataOption[field])
            }} />
        </View>
    )
}

const styles = StyleSheet.create({
    main: {
        backgroundColor: Colors.bg2,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        position: 'absolute',
        bottom: 0,
        padding: 30,
        paddingTop: 20,
        alignItems: 'center'
    },
    video_title: {
        color: Colors.fg1,
        fontSize: 20,
    },
    cover_selector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginTop: 15,
    },
    cover_selector_arrow: {
        transform: [{scaleY: 1.5}],
        paddingHorizontal: '5%',
        paddingVertical: '10%',
        zIndex: 999999,
    },
    cover_selector_image: {
        borderRadius: 20,
        aspectRatio: '1/1',
        width: '100%',
        marginRight: `${TRACK_COVER_MARGIN_RIGHT_PERCENTAGE}%`,
    },
    cover_selector_images: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '100%',
        position: 'relative',
    },
    cover_selector_images_mask: {
        width: '60%',
        borderRadius: 20,
    },
    main_button: {
        marginTop: 25,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 20,
        backgroundColor: Colors.accent1,
        overflow: 'hidden',
    },
    track_metadata_field_container: {
        marginTop: 25,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    track_metadata_field: {
        borderWidth: 2,
        borderColor: Colors.fg2,
        flex: 1,
        borderRadius: 20,
        marginRight: 15,
    },
    track_metadata_input: {
        color: Colors.fg1,
        fontSize: 18,
        padding: 15,
    },
    track_metadata_input_floating_placeholder: {
        color: Colors.fg2,
        fontSize: 14,
        backgroundColor: Colors.bg2,
        paddingHorizontal: 5,
        position: 'absolute',
        top: -10,
        left: 25,
    },
    are_final_values: {
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    are_final_values_text: {
        color: Colors.fg1,
        fontSize: 20,
        marginLeft: 15,
    },
    are_final_values_checkbox: {
        padding: 10,
    },
})
