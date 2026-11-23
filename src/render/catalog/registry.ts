import { Button } from './Button.js';
import { Card } from './Card.js';
import { CheckBox } from './CheckBox.js';
import { Divider } from './Divider.js';
import { Column, Row } from './Layout.js';
import { Text } from './Text.js';
import { TextField } from './TextField.js';
import type { InkComponent } from './types.js';

/** Basic catalog components that a2ui-term renders, by component type. */
export const registry: Readonly<Record<string, InkComponent>> = {
  Button,
  Card,
  CheckBox,
  Column,
  Divider,
  Row,
  Text,
  TextField,
};

/** The component types that a2ui-term renders, sorted by name. */
export function supportedComponents(): string[] {
  return Object.keys(registry).sort();
}
