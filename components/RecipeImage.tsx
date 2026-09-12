import React, { useState } from 'react';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { recipeImageUri } from '@/lib/recipeImageUri';
import { RecipeImagePlaceholder } from '@/components/RecipeImagePlaceholder';

type Props = {
  url: string | null | undefined;
  style: StyleProp<ImageStyle>;
  iconSize?: number;
  accessibilityLabel?: string;
};

/** A changed URL remounts the loader so reused cards never retain a failed/old image. */
export function RecipeImage(props: Props) {
  const uri = recipeImageUri(props.url);
  return <RecipeImageContent key={uri ?? 'missing'} {...props} uri={uri} />;
}

function RecipeImageContent({ uri, style, iconSize = 48, accessibilityLabel }: Props & { uri: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={[style, { overflow: 'hidden' }]} accessible accessibilityRole="image" accessibilityLabel={uri && !failed ? accessibilityLabel ?? 'Recipe photo' : 'No recipe photo'}>
      <RecipeImagePlaceholder style={StyleSheet.absoluteFillObject} iconSize={iconSize} />
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessible={false}
        />
      ) : null}
    </View>
  );
}
