export default {
  expo: {
    name: "InnerSight",
    slug: "innersight",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./src/assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yasirkhan.InnerSight",
      config: {
        usesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./src/assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.yasirkhan.innersight"
    },
    web: {
      favicon: "./src/assets/favicon.png"
    },
    scheme: "innersight",
    plugins: [
      [
        "expo-auth-session",
        {
          schemes: ["innersight"]
        }
      ]
    ]
  }
}; 