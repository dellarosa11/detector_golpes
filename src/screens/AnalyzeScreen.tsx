import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { palette, styles } from '@/components/detector-app.styles';
import type { AnalysisType } from '@/lib/firebase-data';
import { AppScreen, BackHeader, Entrance, MotionPressable } from '@/src/components';
import type { SelectedAnalysisImage } from '@/src/types/analysis';
import type { Navigate } from '@/src/types/navigation';

export type AnalyzeScreenProps = {
  navigate: Navigate;
  analysisType: AnalysisType;
  image?: SelectedAnalysisImage;
  message: string;
  onChangeType: (type: AnalysisType) => void;
  onChangeMessage: (message: string) => void;
  onChooseImage: (source: 'camera' | 'library') => Promise<void>;
  onRemoveImage: () => void;
  onAnalyze: () => Promise<void>;
  error?: string;
};

/**
 * Entrada unificada para mensagem, link e print, mantendo cada fluxo claro no celular.
 */
export function AnalyzeScreen({
  navigate,
  analysisType,
  image,
  message,
  onChangeType,
  onChangeMessage,
  onChooseImage,
  onRemoveImage,
  onAnalyze,
  error,
}: AnalyzeScreenProps) {
  const [messageFocused, setMessageFocused] = useState(false);
  const canAnalyze = analysisType === 'image' ? Boolean(image) : Boolean(message.trim());
  const copy = {
    message: {
      title: 'Analisar mensagem',
      subtitle: 'Cole abaixo a mensagem que você recebeu.',
      privacy: 'Evite enviar CPF, senha, número de cartão ou outros dados pessoais.',
      button: 'Analisar risco',
    },
    link: {
      title: 'Analisar link',
      subtitle: 'Cole o endereço sem abri-lo. A API verificará sua estrutura com segurança.',
      privacy: 'O link não será aberto. Apenas o endereço visível será analisado.',
      button: 'Verificar link',
    },
    image: {
      title: 'Analisar imagem',
      subtitle: 'Envie um print nítido da conversa, anúncio ou cobrança suspeita.',
      privacy: 'A imagem é enviada somente para sua API local e não é salva no histórico.',
      button: 'Ler imagem e analisar',
    },
  }[analysisType];

  return (
    <AppScreen>
      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.analyzeContent}>
        <Entrance delay={20}>
          <BackHeader title={copy.title} onBack={() => navigate('home')} />
          <Text style={styles.analyzeSubtitle}>{copy.subtitle}</Text>
        </Entrance>

        <Entrance delay={90}>
          <View accessibilityRole="tablist" style={styles.analysisModeTabs}>
            {(
              [
                { type: 'message', label: 'Mensagem', icon: 'chatbubble-outline' },
                { type: 'link', label: 'Link', icon: 'link-outline' },
                { type: 'image', label: 'Imagem', icon: 'image-outline' },
              ] as const
            ).map((item) => {
              const selected = item.type === analysisType;
              return (
                <MotionPressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={item.type}
                  onPress={() => onChangeType(item.type)}
                  style={[styles.analysisModeTab, selected && styles.analysisModeTabSelected]}>
                  <Ionicons
                    name={item.icon}
                    size={15}
                    color={selected ? palette.green : palette.muted}
                  />
                  <Text style={[styles.analysisModeTabText, selected && styles.analysisModeTabTextSelected]}>
                    {item.label}
                  </Text>
                </MotionPressable>
              );
            })}
          </View>
        </Entrance>

        {analysisType === 'message' ? (
          <Entrance delay={140}>
            <Text style={[styles.fieldTitle, messageFocused && styles.fieldTitleFocused]}>
              Mensagem recebida
            </Text>
            <View style={[styles.messageBox, messageFocused && styles.messageBoxFocused]}>
              <TextInput
                accessibilityLabel="Mensagem recebida"
                maxLength={1500}
                multiline
                onBlur={() => setMessageFocused(false)}
                onChangeText={onChangeMessage}
                onFocus={() => setMessageFocused(true)}
                placeholder="Ex.: “Detectamos uma compra de R$ 2.599. Caso não reconheça, acesse imediatamente...”"
                placeholderTextColor={palette.muted}
                selectionColor={palette.green}
                style={styles.messageInput}
                textAlignVertical="top"
                value={message}
              />
              <Text style={[styles.characterCount, messageFocused && styles.characterCountFocused]}>
                {message.length} / 1500 caracteres
              </Text>
            </View>
          </Entrance>
        ) : null}

        {analysisType === 'link' ? (
          <Entrance delay={140}>
            <Text style={[styles.fieldTitle, messageFocused && styles.fieldTitleFocused]}>
              Endereço recebido
            </Text>
            <View style={[styles.linkInputBox, messageFocused && styles.messageBoxFocused]}>
              <Ionicons name="link-outline" size={20} color={messageFocused ? palette.green : palette.muted} />
              <TextInput
                accessibilityLabel="Link recebido"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                maxLength={2048}
                onBlur={() => setMessageFocused(false)}
                onChangeText={onChangeMessage}
                onFocus={() => setMessageFocused(true)}
                placeholder="https://exemplo.com/verificar"
                placeholderTextColor={palette.muted}
                selectionColor={palette.green}
                style={styles.linkInput}
                value={message}
              />
              {message ? (
                <Pressable accessibilityLabel="Limpar link" hitSlop={8} onPress={() => onChangeMessage('')}>
                  <Ionicons name="close-circle" size={19} color={palette.muted} />
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.linkHint}>Confira principalmente o domínio antes da primeira barra “/”.</Text>
          </Entrance>
        ) : null}

        {analysisType === 'image' ? (
          <Entrance delay={140}>
            <Text style={styles.fieldTitle}>Print ou foto</Text>
            {image ? (
              <View style={styles.selectedImageCard}>
                <Image contentFit="contain" source={{ uri: image.uri }} style={styles.analysisImagePreview} />
                <View style={styles.selectedImageBadge}>
                  <Ionicons name="checkmark-circle" size={15} color={palette.greenSuccess} />
                  <Text style={styles.selectedImageBadgeText}>Imagem pronta para leitura</Text>
                </View>
                <View style={styles.imageActionRow}>
                  <MotionPressable
                    accessibilityRole="button"
                    onPress={() => void onChooseImage('library')}
                    style={styles.imageSecondaryButton}>
                    <Ionicons name="images-outline" size={16} color={palette.green} />
                    <Text style={styles.imageSecondaryButtonText}>Trocar</Text>
                  </MotionPressable>
                  <MotionPressable
                    accessibilityRole="button"
                    onPress={() => void onChooseImage('camera')}
                    style={styles.imageSecondaryButton}>
                    <Ionicons name="camera-outline" size={16} color={palette.green} />
                    <Text style={styles.imageSecondaryButtonText}>Câmera</Text>
                  </MotionPressable>
                  <Pressable
                    accessibilityLabel="Remover imagem"
                    hitSlop={8}
                    onPress={onRemoveImage}
                    style={styles.imageRemoveButton}>
                    <Ionicons name="trash-outline" size={16} color={palette.red} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.imageUploadCard}>
                <View style={styles.imageUploadIcon}>
                  <Ionicons name="scan-outline" size={30} color={palette.green} />
                </View>
                <Text style={styles.imageUploadTitle}>Escolha uma imagem nítida</Text>
                <Text style={styles.imageUploadDescription}>
                  O OCR localizará o texto e o BERTimbau fará a classificação de risco.
                </Text>
                <View style={styles.imagePickerButtons}>
                  <MotionPressable
                    accessibilityRole="button"
                    onPress={() => void onChooseImage('library')}
                    style={styles.imagePrimaryButton}>
                    <Ionicons name="images-outline" size={17} color="#FFFFFF" />
                    <Text style={styles.imagePrimaryButtonText}>Galeria</Text>
                  </MotionPressable>
                  <MotionPressable
                    accessibilityRole="button"
                    onPress={() => void onChooseImage('camera')}
                    style={styles.imageSecondaryButton}>
                    <Ionicons name="camera-outline" size={17} color={palette.green} />
                    <Text style={styles.imageSecondaryButtonText}>Câmera</Text>
                  </MotionPressable>
                </View>
              </View>
            )}
          </Entrance>
        ) : null}

        <Entrance delay={220}>
          <View style={styles.privacyCard}>
            <View style={styles.privacyTitleRow}>
              <Ionicons name="lock-closed-outline" size={15} color={palette.green} />
              <Text style={styles.privacyCardTitle}>Privacidade</Text>
            </View>
            <Text style={styles.privacyCardText}>{copy.privacy}</Text>
          </View>
        </Entrance>

        <Entrance delay={290}>
          {error ? (
            <View style={styles.saveFeedback}>
              <Ionicons name="alert-circle-outline" size={16} color={palette.red} />
              <Text accessibilityLiveRegion="polite" style={styles.saveFeedbackText}>
                {error}
              </Text>
            </View>
          ) : null}
          <MotionPressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canAnalyze }}
            disabled={!canAnalyze}
            onPress={() => void onAnalyze()}
            style={[styles.primaryGreenButton, !canAnalyze && styles.buttonDisabled]}>
            <Text style={styles.primaryGreenButtonText}>{copy.button}</Text>
            <Ionicons name="sparkles-outline" size={17} color="#FFFFFF" />
          </MotionPressable>
          <Text style={styles.disclaimer}>
            A análise é educativa e não substitui a confirmação com a instituição oficial.
          </Text>
        </Entrance>
      </ScrollView>
    </AppScreen>
  );
}
