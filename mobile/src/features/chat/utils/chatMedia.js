import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

async function openPicker(source) {
  const permission = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permission.status !== 'granted') {
    Alert.alert(
      'Permission requise',
      source === 'camera'
        ? 'SHIFAA a besoin de la permission pour utiliser l’appareil photo.'
        : 'SHIFAA a besoin de la permission pour accéder à vos photos.'
    );
    return null;
  }

  const launch = source === 'camera'
    ? ImagePicker.launchCameraAsync
    : ImagePicker.launchImageLibraryAsync;
  const result = await launch({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.5,
    base64: true,
  });
  if (result.canceled || !result.assets?.[0]?.base64) return null;

  const asset = result.assets[0];
  return `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
}

export function pickChatImage() {
  return new Promise((resolve) => {
    Alert.alert('Ajouter une photo', 'Choisissez une source.', [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(null) },
      { text: 'Galerie', onPress: async () => resolve(await openPicker('library')) },
      { text: 'Appareil photo', onPress: async () => resolve(await openPicker('camera')) },
    ]);
  });
}
