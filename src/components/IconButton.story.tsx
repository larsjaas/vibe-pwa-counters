import { IconButton } from './IconButton';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import React from 'react';

export const Default = {
  story: () => <IconButton icon={Plus} onClick={() => alert('Plus clicked')} />,
  name: 'Default',
};

export const Blue = {
  story: () => <IconButton icon={Edit2} onClick={() => alert('Edit clicked')} backgroundColor="#0070f3" color="#fff" />,
  name: 'Blue',
};

export const Red = {
  story: () => <IconButton icon={Trash2} onClick={() => alert('Delete clicked')} backgroundColor="#ff4d4f" color="#fff" />,
  name: 'Red',
};
