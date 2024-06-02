import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import 'expo-dev-client'
import * as FileSystem from 'expo-file-system'
import React from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Checkbox } from './Checkbox'
import { DarkBackground } from './DarkBackground'
import { Colors } from './globals'

const APP_SETTINGS_FILENAME = 'app-settings.json'
const APP_SETTINGS_PARENT_DIR = FileSystem.documentDirectory!
const APP_SETTINGS_PATH = APP_SETTINGS_PARENT_DIR + APP_SETTINGS_FILENAME

export type ArtistPattern = {
    id: number
    artist: string
    regex: string
    caseInsensitive: boolean
}

export type AppSettings = {
    downloadsURI: string | null
    knownArtistPatterns: ArtistPattern[]
    serverURL: string | null
}

const defaultAppSettings: AppSettings = {
    downloadsURI: null,
    knownArtistPatterns: [],
    serverURL: null,
}

const APP_NAME_MEANING = [
	['I', 'llicitly'],
	['T', 'aking'],
	['A', 'udio,'],
	['D', 'ownloading'],
	['A', 'nd'],
	['K', 'eeping'],
	['I', 'n'],
	['M', 'emory,'],
	['A', 'voiding'],
	['S', 'potify'],
	['U', 'sage'],
]

export async function updateAppSettings(newSettings: Partial<AppSettings>): Promise<void> {
    const curretSettings = await getAppSettings()
    const settingsToWrite = {
        ...curretSettings,
        ...newSettings
    }
    await FileSystem.writeAsStringAsync(APP_SETTINGS_PATH, JSON.stringify(settingsToWrite))
}

export async function getAppSettings(): Promise<AppSettings> {
    await createAppSettingsFileIfDoesNotExist()
    const content = await FileSystem.readAsStringAsync(APP_SETTINGS_PATH)
    return {
        ...defaultAppSettings,
        ...JSON.parse(content)
    }
}

async function createAppSettingsFileIfDoesNotExist(): Promise<void> {
    if (!(await FileSystem.getInfoAsync(APP_SETTINGS_PATH)).exists) {
        FileSystem.writeAsStringAsync(APP_SETTINGS_PATH, JSON.stringify(defaultAppSettings))
    }
}

async function checkServerURL(url: string): Promise<boolean> {
    url += url.endsWith('/') ? 'ping' : '/ping'

    try {
        const response = await fetch(url)
        return response.status === 200
    } catch(error) {
        return false
    }
}

function parseURI(uri: string): string {
    const [root, path] = decodeURIComponent(uri.split('/tree/', 2)[1]).split(':', 2)
    return `${root === 'primary' ? 'Internal' : 'External'}: /${path}`
}

type SettingsModalProps = {
    onRequestClose: () => void
}

export function SettingsModal({onRequestClose}: SettingsModalProps) {
    const [appSettings, setAppSettings] = React.useState<AppSettings>(defaultAppSettings)

    const [isArtistPatternsModalOpen, setIsArtistPatternsModalOpen] = React.useState(false)
    const [isServerURLModalOpen, setIsServerURLModalOpen] = React.useState(false)
    const [isAboutModalOpen, setIsAboutModalOpen] = React.useState(false)

    React.useEffect(function() {
        getAppSettings()
            .then(function(settings) {
                setAppSettings(settings)
            })
    }, [])

    const handleChangeDownloadsDirectory = React.useCallback(async function(): Promise<void> {
        const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync()

        if (permission.granted) {
            const appSettings = await getAppSettings()
            appSettings.downloadsURI = permission.directoryUri
            await updateAppSettings(appSettings)
            setAppSettings({...appSettings})
        }
    }, [])

    async function handleUpdateServerURL(value: string | null): Promise<void> {
        if (value !== null && value.trim().length === 0) {
            value = null
        }
        if (value !== null) {
            if (!await checkServerURL(value)) {
                alert(`Could not find server with URL: ${value}`)
                return
            }
        }
        appSettings.serverURL = value
        updateAppSettings(appSettings)
        setAppSettings({...appSettings})
        setIsServerURLModalOpen(false)
    } 

    function handleCloseAboutModal(): void {
        setIsAboutModalOpen(false)
    }

    return (
        <Modal visible animationType='slide' transparent onRequestClose={onRequestClose}>
            <DarkBackground onPress={onRequestClose} />
            <View style={styles.main} >

                <Text style={styles.page_title}>Settings</Text>

                <Pressable onPress={handleChangeDownloadsDirectory}>
                    <View style={styles.field}>
                        <View style={styles.field_texts}>
                            <Text style={styles.field_name}>Downloads directory</Text>
                            <Text style={styles.field_value} numberOfLines={1}>
                                {appSettings.downloadsURI && parseURI(appSettings.downloadsURI) || 'No directory set yet.'}
                            </Text>
                        </View>
                        <MaterialCommunityIcons style={styles.field_icon} name="folder" size={30} color={Colors.fg2} />
                    </View>
                </Pressable>

                <Pressable onPress={function() {setIsArtistPatternsModalOpen(true)}}>
                    <View style={styles.field}>
                        <Text style={styles.field_name}>Known artist patterns</Text>
                    </View>
                </Pressable>
                {isArtistPatternsModalOpen &&
                    <KnownArtistPattersModal onRequestClose={function() {setIsArtistPatternsModalOpen(false)}} />
                }

                <Pressable onPress={function() {setIsServerURLModalOpen(true)}}>
                    <View style={styles.field}>
                        <View style={styles.field_texts}>
                            <Text style={styles.field_name}>Server URL</Text>
                            <Text style={styles.field_value} numberOfLines={1}>
                                {appSettings.serverURL || 'No server URL set yet.'}
                            </Text>
                        </View>
                    </View>
                </Pressable>
                {isServerURLModalOpen &&
                    <TextInputModal
                        initValue={appSettings.serverURL ?? ''}
                        example='http://10.0.0.69:4000'
                        updateValue={handleUpdateServerURL}
                        onRequestClose={function() {setIsServerURLModalOpen(false)}}
                    />
                }

                <Pressable onPress={function() {setIsAboutModalOpen(true)}}>
                    <View style={styles.field}>
                        <Text style={styles.field_name}>About</Text>
                        <MaterialIcons name="info-outline" size={30} color={Colors.fg2} />
                    </View>
                </Pressable>
                {isAboutModalOpen &&
                    <Modal visible transparent animationType='slide' onRequestClose={handleCloseAboutModal}>
                        <DarkBackground onPress={handleCloseAboutModal} />
                        <View style={styles.about_modal}>
                            <Text style={styles.about_modal_title}>ITADAKIMASU stands for</Text>
                            <View style={styles.about_modal_words}>
                                {
                                    APP_NAME_MEANING.map((word, idx) =>
                                        <View style={styles.about_modal_word} key={idx}>
                                            <Text style={styles.about_modal_word_initial}>{word[0]}</Text>
                                            <Text style={styles.about_modal_word_rest}>{word[1]}</Text>
                                        </View>
                                    )
                                }
                            </View>
                            <Pressable onPress={handleCloseAboutModal}>
                                <Text style={styles.about_modal_button}>Close</Text>
                            </Pressable>
                        </View>
                    </Modal>
                }
            </View>
        </Modal>
    )
}

type TextInputModalProps = {
    initValue: string
    example?: string
    updateValue: (value: string | null) => Promise<void>
    onRequestClose: () => void
}

function TextInputModal({initValue, example, updateValue, onRequestClose}: TextInputModalProps) {
    const [value, setValue] = React.useState(initValue)

    return (
        <Modal visible transparent animationType='slide' onRequestClose={onRequestClose}>
            <DarkBackground onPress={onRequestClose} />
            <View style={styles.text_input_modal}>
                <TextInput
                    style={styles.text_input_modal_input}
                    placeholder='Server URL'
                    placeholderTextColor={Colors.fg3}
                    value={value}
                    onChangeText={function(text) {setValue(text)}}
                />

                {example && <Text style={styles.text_input_modal_input_example}>Eg: {example}</Text>}

                <View style={styles.text_input_modal_buttons}>
                    <Pressable onPress={onRequestClose}>
                        <View style={styles.text_input_modal_button}>
                            <Text style={styles.text_input_modal_button_text}>Cancel</Text>
                        </View>
                    </Pressable>

                    <Pressable onPress={function() {updateValue(value)}}>
                        <View style={styles.text_input_modal_button}>
                            <Text style={styles.text_input_modal_button_text}>Ok</Text>
                        </View>
                    </Pressable>
                </View>
            </View>
        </Modal>
    )
}

type KnownArtistPattersModalProps = {
    onRequestClose: () => void
}

function KnownArtistPattersModal({onRequestClose}: KnownArtistPattersModalProps) {
    const [isCreatePatternModalOpen, setIsCreatePatternModalOpen] = React.useState(false)
    const [editingPattern, setEditingPattern] = React.useState<ArtistPattern>()
    const [artistPatterns, setArtistPatterns] = React.useState<ArtistPattern[]>([])

    React.useEffect(function() {
        getAppSettings()
            .then(function(appSettings) {
                setArtistPatterns(appSettings.knownArtistPatterns)
            })
    }, [])

    function addNewPattern(artist: string, regex: string, caseInsensitive: boolean): void {
        const newID = artistPatterns.reduce(function(biggestID, pattern) {
            if (pattern.id > biggestID) {
                return pattern.id
            }
            return biggestID
        }, -1) + 1
        const newPatterns = artistPatterns.concat({id: newID, artist, regex, caseInsensitive: caseInsensitive})
        updateAppSettings({knownArtistPatterns: newPatterns})
        setArtistPatterns(newPatterns)
    }

    function editPattern(id: number, artist: string, regex: string, caseInsensitive: boolean): void {
        const newPatterns = artistPatterns.map(function(pattern) {
            if (pattern.id === id) {
                return {id, artist, regex, caseInsensitive: caseInsensitive}
            }
            return pattern
        })
        updateAppSettings({knownArtistPatterns: newPatterns})
        setArtistPatterns(newPatterns)
    }

    function deletePattern(id: number): void {
        const newPatterns = artistPatterns.filter((pattern) => pattern.id !== id)
        updateAppSettings({knownArtistPatterns: newPatterns})
        setArtistPatterns(newPatterns)
    }

    function closeAddPatternModal(): void {
        setIsCreatePatternModalOpen(false)
        setEditingPattern(undefined)
    }

    return (
        <Modal visible transparent animationType='slide' onRequestClose={onRequestClose}>
            <ScrollView style={styles.artist_patterns_modal} keyboardShouldPersistTaps='handled'>
                {artistPatterns.map((pattern) =>
                    <View style={styles.artist_patterns_item} key={pattern.id}>
                        <View style={styles.artist_patterns_item_content}>
                            <Text style={styles.artist_patterns_item_artist} numberOfLines={1}>{pattern.artist}</Text>
                            <Text style={styles.artist_patterns_item_regex} numberOfLines={1}>{pattern.regex}</Text>
                        </View>
                        <Pressable onPress={function() {
                            setIsCreatePatternModalOpen(true)
                            setEditingPattern(pattern)
                        }}>
                            <MaterialIcons name="edit" size={24} color={Colors.fg1} />
                        </Pressable>
                    </View>
                )}
                {artistPatterns.length === 0 &&
                    <Text style={styles.artist_patterns_no_items}>No patterns created yet.</Text>
                }
                <Pressable onPress={function() {setIsCreatePatternModalOpen(true)}}>
                    <View style={styles.artist_patterns_add_item_button}>
                        <MaterialIcons name="add" size={24} color={Colors.fg1} />
                        <Text style={styles.artist_patterns_add_item_button_text}>Add</Text>
                    </View>
                </Pressable>

                {isCreatePatternModalOpen &&
                    <CreateArtistPatternModal
                        onRequestClose={closeAddPatternModal}
                        addNewPattern={addNewPattern}
                        editPattern={editPattern}
                        deletePattern={deletePattern}
                        editingPattern={editingPattern}
                    />
                }
            </ScrollView>
        </Modal>
    )
}

type CreateArtistPatternProps = {
    onRequestClose: () => void
    addNewPattern: (artist: string, regex: string, caseInsensitive: boolean) => void
    editPattern: (id: number, artist: string, regex: string, caseInsensitive: boolean) => void
    deletePattern: (id: number) => void
    editingPattern?: ArtistPattern
}

function CreateArtistPatternModal({editingPattern, addNewPattern, editPattern, deletePattern, onRequestClose}: CreateArtistPatternProps) {
    let [artist, setArtist] = React.useState(editingPattern?.artist ?? '')
    let [regex, setRegex] = React.useState(editingPattern?.regex ?? '')
    const [caseInsensitive, setCaseInsensitive] = React.useState(editingPattern?.caseInsensitive ?? true)

    function handleSavePattern(): void {
        artist = artist.trim()
        regex = regex.trim()

        if (artist.length === 0 || regex.length === 0) {
            alert('"Artist" and "RegEx" are required.')
            return
        }

        try {
            new RegExp(regex)
        } catch(error) {
            if (error instanceof SyntaxError) {
                alert(error.message)
                return
            }
            alert('Invalid RegEx.')
        }

        if (editingPattern) {
            editPattern(editingPattern.id, artist, regex, caseInsensitive)
        } else {
            addNewPattern(artist, regex, caseInsensitive)
        }
        onRequestClose()
    }

    function handleDeletePattern(): void {
        if (!editingPattern) {
            return
        }
        deletePattern(editingPattern.id)
        onRequestClose()
    }

    return (
        <Modal visible transparent animationType='slide' onRequestClose={onRequestClose}>
            <DarkBackground onPress={onRequestClose} />
            <View style={styles.text_input_modal}>
                <TextInput
                    style={styles.text_input_modal_input}
                    placeholder='Artist'
                    placeholderTextColor={Colors.fg3}
                    value={artist}
                    onChangeText={function(text) {setArtist(text)}}
                />
                <TextInput
                    style={[styles.text_input_modal_input, {fontFamily: 'monospace'}]}
                    placeholder='RegEx'
                    placeholderTextColor={Colors.fg3}
                    autoCapitalize='none'
                    autoCorrect={false}
                    value={regex}
                    onChangeText={function(text) {setRegex(text)}}
                />
                <View style={styles.artist_patterns_create_item_checkbox_row}>
                    <Text style={styles.artist_patterns_create_item_checkbox_name}>Makes matches case-insensitive</Text>
                    <Checkbox
                        value={caseInsensitive}
                        onPress={function() {setCaseInsensitive(!caseInsensitive)}}
                        style={styles.artist_patterns_create_item_checkbox}
                    />
                </View>
                <View style={styles.text_input_modal_buttons}>
                    <Pressable onPress={onRequestClose}>
                        <View style={styles.text_input_modal_button}>
                            <Text style={styles.text_input_modal_button_text}>Cancel</Text>
                        </View>
                    </Pressable>

                    {editingPattern &&
                        <Pressable onPress={handleDeletePattern}>
                            <View style={styles.text_input_modal_button}>
                                <Text style={styles.text_input_modal_button_text}>Delete</Text>
                            </View>
                        </Pressable>
                    }

                    <Pressable onPress={handleSavePattern}>
                        <View style={styles.text_input_modal_button}>
                            <Text style={styles.text_input_modal_button_text}>{editingPattern ? 'Save' : 'Add'}</Text>
                        </View>
                    </Pressable>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    main: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 10,
        left: 0,
        padding: 30,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        backgroundColor: Colors.bg2,
    },
    page_title: {
        fontSize: 34,
        color: Colors.fg1,
        marginBottom: 40,
        marginTop: 20,
    },
    field: {
        width: '100%',
        marginBottom: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    field_texts: {
        flex: 1,
        alignItems: 'flex-start',
    },
    field_name: {
        fontSize: 18,
        color: Colors.fg1,
    },
    field_value: {
        fontSize: 16,
        color: Colors.fg2,
        maxWidth: '95%',
    },
    field_icon: {
        marginLeft: 20,
    },
    artist_patterns_modal: {
        width: '100%',
        height: '100%',
        overflow: 'scroll',
        position: 'absolute',
        top: 10,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 30,
        paddingTop: 40,
        backgroundColor: Colors.bg2
    },
    artist_patterns_no_items: {
        color: Colors.fg3,
        fontSize: 20,
        marginHorizontal: 'auto'
    },
    artist_patterns_item: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    artist_patterns_item_content: {
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        width: '90%',
    },
    artist_patterns_item_artist: {
        fontSize: 18,
        color: Colors.fg1,
        marginBottom: 5,
    },
    artist_patterns_item_regex: {
        fontSize: 18,
        fontFamily: 'monospace',
        color: Colors.fg1,
        backgroundColor: Colors.bg3,
        padding: 5,
        paddingHorizontal: 10,
        borderRadius: 10,
    },
    artist_patterns_add_item_button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        paddingLeft: 4,
        borderRadius: 20,
        backgroundColor: Colors.bg3,
        marginTop: 40,
        marginBottom: 100,
    },
    artist_patterns_add_item_button_text: {
        color: Colors.fg1,
        fontSize: 22,
        marginLeft: 2,
    },
    text_input_modal: {
        width: '100%',
        position: 'absolute',
        bottom: 0,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 30,
        backgroundColor: Colors.bg2
    },
    text_input_modal_input: {
        padding: 15,
        paddingHorizontal: 20,
        fontSize: 18,
        color: Colors.fg1,
        borderColor: Colors.fg3,
        borderWidth: 2,
        borderRadius: 20,
        marginBottom: 20,
        backgroundColor: Colors.bg2,
    },
    text_input_modal_input_example: {
        fontSize: 18,
        color: Colors.fg3,
        paddingLeft: 5,
        marginBottom: 20,
    },
    artist_patterns_create_item_checkbox_row: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    artist_patterns_create_item_checkbox_name: {
        fontSize: 18,
        color: Colors.fg1,
        paddingLeft: 5,
    },
    artist_patterns_create_item_checkbox: {

    },
    text_input_modal_buttons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        flex: 1,
    },
    text_input_modal_button: {
        backgroundColor: Colors.bg3,
        borderRadius: 20,
        padding: 20,
        paddingHorizontal: 30,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    text_input_modal_button_text: {
        color: Colors.fg1,
        fontSize: 18,
    },
    about_modal: {
        width: '100%',
        position: 'absolute',
        bottom: 0,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 30,
        backgroundColor: Colors.bg2
    },
    about_modal_title: {
        fontSize: 24,
        color: Colors.fg1,
        marginHorizontal: 'auto',
        marginBottom: 30,
    },
    about_modal_words: {
        width: '90%',
        marginHorizontal: 'auto',
    },
    about_modal_word: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    about_modal_word_initial: {
        fontFamily: 'monospace',
        fontWeight: 'bold',
        fontSize: 21,
        color: Colors.fg1,
        marginRight: 2,
    },
    about_modal_word_rest: {
        fontFamily: 'monospace',
        fontSize: 20,
        color: Colors.fg2,
    },
    about_modal_button: {
        fontSize: 20,
        color: Colors.fg1,
        backgroundColor: Colors.bg3,
        borderRadius: 20,
        padding: 20,
        paddingHorizontal: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 'auto',
        marginTop: 40,
    },
})
