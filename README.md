# Itadakimasu
> :warning: This repo contains only the mobile app. You need to complement it with the [API](https://github.com/MarcosTypeAP/itadakimasu-api)

This mobile app allows users to download music from YouTube and add metadata, such as title, artist, album, and album cover.<br>
You can set title, artist and album, either manually or by fetching it from Spotify, also a cover from the video thumbnail or Spotify.

**Itadakimasu** stands for:<br>
>**I**llicitly<br>
**T**aking<br>
**A**udio,<br>
**D**ownloading<br>
**A**nd<br>
**K**eeping<br>
**I**n<br>
**M**emory,<br>
**A**voiding<br>
**S**potify<br>
**U**sage<br>

Its primary use case is downloading the best mashups, covers, and versions that are not available on your main streaming service.

<table>
    <tr>
        <td>
            <img src="https://github.com/MarcosTypeAP/itadakimasu-client/blob/main/images/search_video.png" />
        </td>
        <td>
            <img src="https://github.com/MarcosTypeAP/itadakimasu-client/blob/main/images/modify_album.png" />
        </td>
        <td>
            <img src="https://github.com/MarcosTypeAP/itadakimasu-client/blob/main/images/download_song.png" />
        </td>
        <td>
            <img src="https://github.com/MarcosTypeAP/itadakimasu-client/blob/main/images/play_song.png" />
        </td>
    </tr>
</table>

>The music player is [Oto Music](https://play.google.com/store/apps/details?id=com.piyush.music)

# Building

```shell
# Download the repo
git clone https://github.com/MarcosTypeAP/itadakimasu-client.git
cd itadakimasu-client

# Install dependencies
$ npm install

# And the EAS-Cli to build it
$ npm install eas-cli
# Now, unfortunately, you have to login with an Expo account (https://expo.dev/signup)
$ npx eas login

# I used this command to build it locally
$ npx eas build --platform android --local --output build/build.apk
# Optionally, you can add your preferred program for sending notifications to inform you when the process is complete 
$ npx eas build --platform android --local --output build/build.apk && notify-send 'Build succeeded' -t 9999999 || notify-send 'Build failed' -t 9999999
```

Now, you just need to transfer the APK (`./build/build.apk`) to your phone and install it normally (locate the file in your file explorer and open it).

For more information, read this [Expo guide](https://docs.expo.dev/build/setup/) on how to build an app.
