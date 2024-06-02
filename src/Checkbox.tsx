import React from 'react'
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native'
import Animated, { Easing, useSharedValue, withTiming } from 'react-native-reanimated'
import { Colors } from './globals'

const TRACK_WIDTH = 70
const TRACK_HEIGHT = 40
const TRACK_PADDING = 6
const THUMB_DIAMETER = TRACK_HEIGHT - TRACK_PADDING * 2

const THUMB_LEFT_TRUE = TRACK_WIDTH - TRACK_PADDING * 2 - THUMB_DIAMETER
const THUMB_LEFT_FALSE = 0

const THUMB_COLOR_TRUE = Colors.fg1
const THUMB_COLOR_FALSE = Colors.fg3

const TRACK_COLOR_TRUE = Colors.accent1
const TRACK_COLOR_FALSE = Colors.bg3

const TIMING_CONFIG = {
    duration: 100,
    easing: Easing.out(Easing.sin)
}

type CheckboxProps = {
    style?: StyleProp<ViewStyle>
    value?: boolean
    onPress: () => void
}

export function Checkbox({style, value = false, onPress}: CheckboxProps) {
    const trackColor = useSharedValue(value ? TRACK_COLOR_TRUE : TRACK_COLOR_FALSE)
    const thumbColor = useSharedValue(value ? THUMB_COLOR_TRUE : THUMB_COLOR_FALSE)
    const thumbLeft = useSharedValue(value ? THUMB_LEFT_TRUE : THUMB_LEFT_FALSE)

    const trackInitStyle = React.useMemo(function(): StyleProp<ViewStyle> {
        return {
            backgroundColor: value ? TRACK_COLOR_TRUE : TRACK_COLOR_FALSE,
        }
    }, [])

    const thumbInitStyle = React.useMemo(function(): StyleProp<ViewStyle> {
        return {
            backgroundColor: value ? THUMB_COLOR_TRUE : THUMB_COLOR_FALSE,
            left: value ? THUMB_LEFT_TRUE : THUMB_LEFT_FALSE,
        }
    }, [])

    React.useEffect(function() {
        if (value) {
            trackColor.value = withTiming(TRACK_COLOR_TRUE, TIMING_CONFIG)
            thumbColor.value = withTiming(THUMB_COLOR_TRUE, TIMING_CONFIG)
            thumbLeft.value = withTiming(THUMB_LEFT_TRUE, TIMING_CONFIG)
        } else {
            trackColor.value = withTiming(TRACK_COLOR_FALSE, TIMING_CONFIG)
            thumbColor.value = withTiming(THUMB_COLOR_FALSE, TIMING_CONFIG)
            thumbLeft.value = withTiming(THUMB_LEFT_FALSE, TIMING_CONFIG)
        }
    }, [value])

    return (
        <Pressable style={style} onPress={onPress}>
            <Animated.View style={[styles.checkbox_track, trackInitStyle, {backgroundColor: trackColor}]}>
                <Animated.View style={[styles.checkbox_thumb, thumbInitStyle, {left: thumbLeft, backgroundColor: thumbColor}]} />
            </Animated.View>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    checkbox_track: {
        height: TRACK_HEIGHT,
        width: TRACK_WIDTH,
        padding: TRACK_PADDING,
        borderRadius: 100,
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    checkbox_thumb: {
        height: THUMB_DIAMETER,
        width: THUMB_DIAMETER,
        borderRadius: 100,
        position: 'relative',
    },
})
