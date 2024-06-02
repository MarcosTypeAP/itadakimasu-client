import React, { ReactElement } from 'react'
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native'
import Animated, { Easing, useSharedValue, withTiming } from 'react-native-reanimated'
import { Colors } from './globals'

const LOADING_PROGRESS_START = '-122%'
const LOADING_PROGRESS_END = '-1%'

type ProgressButtonProps = {
    startText: string
    loadingText: string
    finishText: string
    startOnPress: () => Promise<boolean>
    finishOnPress?: () => void
    startIcon?: ReactElement
    loadingIcon?: ReactElement
    finishIcon?: ReactElement
    style?: ViewStyle
}

function ProgressButton({
    startText,
    loadingText,
    finishText,
    startOnPress,
    finishOnPress,
    startIcon,
    loadingIcon,
    finishIcon,
    style
}: ProgressButtonProps) {
    const [isLoading, setIsLoading] = React.useState(false)
    const [hasFinished, setHasFinished] = React.useState(false)

    const loadingProgress = useSharedValue(LOADING_PROGRESS_START)
    const buttonLoadingColor = useSharedValue(Colors.accent2)

    const handleOnPress = React.useCallback(async function(): Promise<void> {
        if (isLoading) {
            return
        }

        loadingProgress.value = withTiming(LOADING_PROGRESS_END, {duration: 20000, easing: Easing.linear})
        setIsLoading(true)

        const success = await startOnPress()

        if (success) {
            loadingProgress.value = withTiming(LOADING_PROGRESS_END, {duration: 1000, easing: Easing.out(Easing.exp)})
            buttonLoadingColor.value = withTiming(Colors.success, {duration: 600})
        } else {
            loadingProgress.value = withTiming(LOADING_PROGRESS_START, {duration: 1000, easing: Easing.out(Easing.exp)})
        }

        setIsLoading(false)
        setHasFinished(success)
    }, [isLoading, startOnPress])

    return (
        <Pressable style={[styles.button, style]} onPress={hasFinished ? finishOnPress : handleOnPress}>
            <Animated.View style={[
                styles.button_loading,
                // @ts-ignore `left` do support percentage strings
                {left: loadingProgress, backgroundColor: buttonLoadingColor}
            ]} />
            {isLoading && <>
                {loadingIcon}
                <Text style={styles.button_text}>{loadingText}</Text>
            </>}
            {!hasFinished && !isLoading && <>
                {startIcon}
                <Text style={styles.button_text}>{startText}</Text>
            </>}
            {hasFinished && !isLoading && <>
                {finishIcon}
                <Text style={styles.button_text}>{finishText}</Text>
            </>}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    button: {
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
    button_loading: {
        width: '120%',
        height: '300%',
        position: 'absolute',
        top: '-1%',
        left: LOADING_PROGRESS_START,
    },
    button_text: {
        color: Colors.fg1,
        fontSize: 22,
        zIndex: 99999,
        position: 'relative',
        right: 15,
        marginLeft: 25,
    },
})

export default ProgressButton
