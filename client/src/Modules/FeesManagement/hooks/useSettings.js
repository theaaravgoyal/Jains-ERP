import { useState, useCallback } from 'react';
import { feesApi } from '../../../api/feesApi';
import { useSystemSettings } from '../context/SettingsContext';

/**
 * useSettings - Hook for tracking, editing, and resetting fees management settings parameters.
 */
export const useSettings = () => {
  const { settings, refreshSettings, updateSystemSettings, resetSystemSettings, loading: ctxLoading } = useSystemSettings();
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveSettings = async (settingsData) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await updateSystemSettings(settingsData);
      return res;
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || 'Failed to save settings.');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const resetToFactoryDefaults = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await resetSystemSettings();
      return res;
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || 'Failed to reset settings.');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    settings,
    loading: ctxLoading || actionLoading,
    error,
    refetch: refreshSettings,
    saveSettings,
    resetToFactoryDefaults
  };
};

export default useSettings;

