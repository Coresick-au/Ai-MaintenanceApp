export const formatMoney = (amount: number) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

export const getFormattedDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    const weekday = date.toLocaleDateString('en-AU', { weekday: 'short' });
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${weekday} ${day}/${month}`;
};

export const getLongFormattedDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return dateStr;
    const dayName = date.toLocaleDateString('en-AU', { weekday: 'long' });
    const monthName = date.toLocaleDateString('en-AU', { month: 'long' });
    const dayOfMonth = date.getDate();
    return `${dayName} ${monthName} ${dayOfMonth}`;
};

export const copyText = async (text: string): Promise<boolean> => {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
    }
    // Fallback for HTTP contexts where clipboard API is unavailable
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
};
