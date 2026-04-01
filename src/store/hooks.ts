/**
 * src/store/hooks.ts
 *
 * Typed Redux hooks — use these instead of plain useDispatch / useSelector.
 *
 *   import { useAppDispatch, useAppSelector } from '../store/hooks';
 *
 *   const dispatch    = useAppDispatch();
 *   const candidateId = useAppSelector((s) => s.profile.candidateId);
 */

import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState } from './rootReducer';
import type { AppDispatch } from './store';

/**
 * Typed dispatch hook. Returns AppDispatch so RTK Query thunks are
 * fully typed without manual annotation at every call site.
 */
export const useAppDispatch = (): AppDispatch => useDispatch<AppDispatch>();

/**
 * Typed selector hook. Selectors are type-safe against the full
 * RootState shape — TypeScript will catch invalid field accesses.
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
