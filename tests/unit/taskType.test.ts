import { describe, expect, it } from 'vitest';
import { detectTaskType } from '../../src/analyzer/taskType';

describe('detectTaskType', () => {
  it('detects coding', () => {
    expect(detectTaskType('fix the bug in my python function')).toBe('coding');
    expect(detectTaskType('make website')).toBe('coding');
  });
  it('detects research', () => {
    expect(detectTaskType('research the latest news about Nvidia')).toBe('research');
  });
  it('detects analysis', () => {
    expect(detectTaskType('evaluate the metrics in our quarterly data')).toBe('analysis');
  });
  it('detects writing', () => {
    expect(detectTaskType('draft an email to my landlord')).toBe('writing');
  });
  it('falls back to general', () => {
    expect(detectTaskType('hello there')).toBe('general');
  });
  it('coding wins over writing when both match', () => {
    expect(detectTaskType('write a python script')).toBe('coding');
  });
});
