'use client';

import { Role } from '@nestjs-sso/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

const ROLE_OPTIONS = [
  { value: Role.SUPER_ADMIN, label: '超级管理员' },
  { value: Role.ENTERPRISE_ADMIN, label: '企业管理员' },
  { value: Role.USER, label: '普通用户' },
] as const;

interface RoleSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** 是否允许选择超级管理员（仅超级管理员可见） */
  showSuperAdmin?: boolean;
}

export function RoleSelect({ value, onChange, disabled, showSuperAdmin = false }: RoleSelectProps) {
  const options = showSuperAdmin
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((o) => o.value !== Role.SUPER_ADMIN);

  const selected = options.find((o) => o.value === value);
  const selectedLabel = selected?.label ?? value;

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as string)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue>{selectedLabel || '请选择角色'}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}