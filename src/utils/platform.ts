import {Platform} from 'react-native';

export const baseFontFamily = Platform.OS === 'ios' ? 'System' : 'normal';
