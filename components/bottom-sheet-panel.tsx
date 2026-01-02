/**
 * Apple Maps風ボトムシートパネル
 * ドラッグで展開/縮小できるパネル
 */

import React, { useCallback, useMemo, forwardRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface BottomSheetPanelProps {
  children: React.ReactNode;
  title?: string;
  snapPoints?: (string | number)[];
  initialIndex?: number;
  onChange?: (index: number) => void;
  enablePanDownToClose?: boolean;
}

export const BottomSheetPanel = forwardRef<BottomSheet, BottomSheetPanelProps>(
  function BottomSheetPanel(
    {
      children,
      title,
      snapPoints: customSnapPoints,
      initialIndex = 0,
      onChange,
      enablePanDownToClose = false,
    },
    ref
  ) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Apple Maps風のスナップポイント
    const snapPoints = useMemo(
      () => customSnapPoints || ['15%', '40%', '85%'],
      [customSnapPoints]
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={0}
          appearsOnIndex={2}
          opacity={0.3}
        />
      ),
      []
    );

    const handleSheetChanges = useCallback(
      (index: number) => {
        onChange?.(index);
      },
      [onChange]
    );

    return (
      <BottomSheet
        ref={ref}
        index={initialIndex}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={enablePanDownToClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={[
          styles.background,
          { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
        ]}
        handleIndicatorStyle={[
          styles.indicator,
          { backgroundColor: isDark ? '#64748B' : '#CBD5E1' },
        ]}
        style={styles.sheet}
      >
        <BottomSheetView style={styles.contentContainer}>
          {title && (
            <View style={styles.header}>
              <Text
                style={[
                  styles.title,
                  { color: isDark ? '#F8FAFC' : '#0F172A' },
                ]}
              >
                {title}
              </Text>
            </View>
          )}
          {children}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  background: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  indicator: {
    width: 36,
    height: 5,
    borderRadius: 3,
    marginTop: 8,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});
