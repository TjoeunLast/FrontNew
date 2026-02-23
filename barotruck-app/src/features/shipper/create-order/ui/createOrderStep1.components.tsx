import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/shared/hooks/useAppTheme";

import { s } from "./createOrderStep1.styles";
import type { Option } from "./createOrderStep1.types";

export function SectionTitle({ title }: { title: string }) {
  const { colors: c } = useAppTheme();
  return <Text style={[s.sectionTitle, { color: c.text.primary }]}>{title}</Text>;
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const { colors: c } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.chip,
        {
          borderColor: selected ? c.brand.primary : c.border.default,
          backgroundColor: selected ? c.brand.primarySoft : c.bg.surface,
        },
      ]}
    >
      <Text
        style={[
          s.chipText,
          { color: selected ? c.brand.primary : c.text.secondary },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function InlineDropdownField({
  label,
  valueLabel,
  placeholder,
  open,
  options,
  selectedValue,
  onToggle,
  onSelect,
  searchable = false,
  searchValue = "",
  onSearchChange,
  emptyText = "항목이 없습니다.",
}: {
  label: string;
  valueLabel?: string;
  placeholder: string;
  open: boolean;
  options: Option[];
  selectedValue?: string;
  onToggle: () => void;
  onSelect: (v: Option) => void;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  emptyText?: string;
}) {
  const { colors: c } = useAppTheme();
  return (
    <View style={{ flex: 1 }}>
      {label ? <Text style={[s.fieldLabel, { color: c.text.primary }]}>{label}</Text> : null}
      <Pressable
        onPress={onToggle}
        style={[
          s.select,
          { backgroundColor: c.bg.surface, borderColor: c.border.default },
        ]}
      >
        <Text
          style={[
            s.selectText,
            { color: valueLabel ? c.text.primary : c.text.secondary },
          ]}
          numberOfLines={1}
        >
          {valueLabel ?? placeholder}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={c.text.secondary}
        />
      </Pressable>

      {open ? (
        <View
          style={[
            s.dropdownPanel,
            { backgroundColor: c.bg.surface, borderColor: c.border.default },
          ]}
        >
          {searchable ? (
            <View
              style={[
                s.dropdownSearchWrap,
                { borderColor: c.border.default, backgroundColor: c.bg.canvas },
              ]}
            >
              <Ionicons name="search" size={16} color={c.text.secondary} />
              <TextInput
                value={searchValue}
                onChangeText={onSearchChange}
                placeholder="주소 검색"
                placeholderTextColor={c.text.secondary}
                style={[s.dropdownSearchInput, { color: c.text.primary }]}
              />
            </View>
          ) : null}

          <ScrollView
            style={[s.dropdownList, searchable ? s.dropdownListScrollable : null]}
            nestedScrollEnabled
          >
            {options.length ? (
              options.map((op) => {
                const active = op.value === selectedValue;
                return (
                  <Pressable
                    key={op.value}
                    onPress={() => onSelect(op)}
                    style={[
                      s.dropdownItem,
                      {
                        borderColor: c.border.default,
                        backgroundColor: active ? c.brand.primarySoft : c.bg.surface,
                      },
                    ]}
                  >
                    <Text style={[s.dropdownItemText, { color: c.text.primary }]} numberOfLines={1}>
                      {op.label}
                    </Text>
                    {active ? <Ionicons name="checkmark" size={18} color={c.brand.primary} /> : null}
                  </Pressable>
                );
              })
            ) : (
              <Text style={[s.dropdownEmptyText, { color: c.text.secondary }]}>{emptyText}</Text>
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export function ChoiceCard({
  emoji,
  title,
  desc,
  selected,
  onPress,
}: {
  emoji: string;
  title: string;
  desc: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors: c } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.choiceCard,
        {
          backgroundColor: selected ? c.brand.primarySoft : c.bg.surface,
          borderColor: selected ? c.brand.primary : c.border.default,
        },
      ]}
    >
      <Text style={s.emoji}>{emoji}</Text>
      <Text style={[s.choiceTitle, { color: c.text.primary }]}>{title}</Text>
      <Text style={[s.choiceDesc, { color: c.text.secondary }]}>{desc}</Text>
    </Pressable>
  );
}

export function PaymentTile({
  title,
  desc,
  selected,
  onPress,
}: {
  title: string;
  desc: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors: c } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.payTile,
        {
          backgroundColor: selected ? c.brand.primarySoft : c.bg.surface,
          borderColor: selected ? c.brand.primary : c.border.default,
        },
      ]}
    >
      <Text style={[s.payTitle, { color: c.text.primary }]}>{title}</Text>
      <Text style={[s.payDesc, { color: c.text.secondary }]}>{desc}</Text>
    </Pressable>
  );
}

export function CreateOrderTopBar({ onBack }: { onBack: () => void }) {
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        s.topBar,
        {
          borderBottomColor: c.border.default,
          height: 52 + insets.top + 6,
          paddingTop: insets.top + 6,
        },
      ]}
    >
      <Pressable onPress={onBack} style={s.backBtn}>
        <Ionicons name="chevron-back" size={22} color={c.text.primary} />
      </Pressable>
      <Text style={[s.topTitle, { color: c.text.primary }]}>화물 등록</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

// createOrderStep1.components.tsx 맨 아래에 추가

export function SearchableAddressField({
  label,
  value,
  placeholder,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
}) {
  const { colors: c } = useAppTheme();
  
  return (
    <View style={{ flex: 1, marginBottom: 16 }}>
      {label ? <Text style={[s.fieldLabel, { color: c.text.primary }]}>{label}</Text> : null}
      <Pressable
        onPress={onPress}
        style={[
          s.select, // 기존에 쓰시던 테두리/패딩 스타일 재사용
          { backgroundColor: c.bg.surface, borderColor: c.border.default, justifyContent: 'center' },
        ]}
      >
        <Text
          style={[
            s.selectText,
            { color: value ? c.text.primary : c.text.secondary },
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
      </Pressable>
    </View>
  );
}