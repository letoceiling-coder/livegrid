import { DryRunClassification } from './geo-materialization.types';

export const INHERIT_CLASSIFICATIONS_FOR_TEST = new Set<string>([
  DryRunClassification.WOULD_WRITE_BUILDING,
  DryRunClassification.WOULD_WRITE_BLOCK,
]);
