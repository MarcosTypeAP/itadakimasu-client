import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { AntDesign } from '@expo/vector-icons'
import { Colors } from './globals'
import React from 'react'
import { ViewStyle } from 'react-native'

type SpinnerProps = {
    display: boolean
    size?: number
    speed?: number
    color?: string
    style?: ViewStyle
}

function Spinner({display, style, color = Colors.fg3, size = 50, speed = 8}: SpinnerProps) {
    const rotation = useSharedValue(0)

    const animatedStyle = useAnimatedStyle(function() {
        return {
            transform: [{rotateZ: `${rotation.value}deg`}]
        }
    })

    React.useEffect(function() {
        rotation.value = 0
        rotation.value = withRepeat(withTiming(360, {duration: speed * 100, easing: Easing.inOut(Easing.linear)}), -1)
    })

    if (!display) {
        return
    }

    return (
        <Animated.View style={[style, animatedStyle]}>
            <AntDesign name="loading2" size={size} color={color} />
        </Animated.View>
    )
}

export default Spinner
