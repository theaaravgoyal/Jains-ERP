/**
 * Utility functions for consistent date formatting across the entire ERP portal.
 * Standard format: DD/MM/YYYY (Day/Month/Year).
 */

/**
 * Format any date string or Date object to DD/MM/YYYY format.
 * @param {string | Date | number} dateInput 
 * @returns {string} Formatted date string (e.g., '10/08/2026') or 'N/A'
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Format any date to DD/MM/YYYY HH:mm (12/24 hour time).
 * @param {string | Date | number} dateInput 
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // hour '0' should be '12'

  return `${day}/${month}/${year} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

export default formatDate;
