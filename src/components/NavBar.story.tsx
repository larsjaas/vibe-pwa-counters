import React from 'react';
import { NavBar } from './NavBar';
import { MemoryRouter } from 'react-router-dom';

export const Default = {
  story: () => (
    <MemoryRouter>
      <NavBar />
    </MemoryRouter>
  ),
  name: 'NavBar',
};
