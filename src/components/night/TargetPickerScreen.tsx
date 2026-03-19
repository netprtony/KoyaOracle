import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { NightCTAButton } from './NightCTAButton';
import { TargetCell } from './TargetCell';
import { NIGHT_PALETTE } from '../../constants/nightPalette';

interface TargetItem {
  id: string;
  name: string;
  disabled?: boolean;
}

interface TargetPickerScreenProps {
  targets: TargetItem[];
  maxSelect?: number;
  selectedIds?: string[];
  revengeMode?: boolean;
  onConfirm: (selectedIds: string[]) => void;
}

export function TargetPickerScreen({
  targets,
  maxSelect = 1,
  selectedIds = [],
  revengeMode = false,
  onConfirm,
}: TargetPickerScreenProps) {
  const [selected, setSelected] = useState<string[]>(selectedIds);

  const selectedLabel = useMemo(() => {
    if (selected.length === 0) return 'Chua chon';
    return targets.filter(t => selected.includes(t.id)).map(t => t.name).join(', ');
  }, [selected, targets]);

  const toggle = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      if (prev.length < maxSelect) {
        return [...prev, id];
      }
      if (maxSelect === 1) {
        return [id];
      }
      return prev;
    });
  };

  return (
    <View style={styles.container}>
      {revengeMode ? <Text style={styles.revenge}>DEM BAO THU</Text> : null}
      <Text style={styles.title}>CHON MUC TIEU</Text>
      <Text style={styles.subtitle}>{selected.length} / {maxSelect}</Text>

      <FlatList
        data={targets}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <TargetCell
            index={index + 1}
            playerName={item.name}
            isSelected={selected.includes(item.id)}
            isDisabled={!!item.disabled}
            onPress={() => toggle(item.id)}
          />
        )}
      />

      <Text style={styles.summary}>Muc tieu: {selectedLabel}</Text>

      <NightCTAButton
        label={selected.length === maxSelect ? 'Xac nhan' : `Can chon du ${maxSelect}`}
        disabled={selected.length !== maxSelect}
        onPress={() => onConfirm(selected)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NIGHT_PALETTE.bg,
    padding: 16,
    gap: 10,
  },
  revenge: {
    color: NIGHT_PALETTE.wolfRed,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    color: NIGHT_PALETTE.text,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: NIGHT_PALETTE.textMuted,
    fontSize: 12,
  },
  list: {
    gap: 8,
  },
  row: {
    gap: 8,
  },
  summary: {
    color: NIGHT_PALETTE.text,
    fontWeight: '600',
  },
});
