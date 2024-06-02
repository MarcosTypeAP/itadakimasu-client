import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

type DarkBackgroundProps = {
    onPress: () => void
}

export function DarkBackground({onPress}: DarkBackgroundProps) {
    return (
        <Pressable onPress={onPress}>
            <View style={styles.dark_background} />
        </Pressable>
    )
}

const styles = StyleSheet.create({
    dark_background: {
        height: '100%',
        width: '100%',
        backgroundColor: '#0009'
    },
})
