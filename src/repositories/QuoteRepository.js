import { BaseRepository } from './BaseRepository';
import { orderBy } from 'firebase/firestore';

/**
 * Repository for managing quotes in Firestore
 */
export class QuoteRepository extends BaseRepository {
    constructor() {
        super('quotes');
    }

    /**
     * Subscribe to quotes ordered by last modified date
     * @param {Function} callback - Called with updated quotes
     * @param {Function} errorCallback - Called on error
     * @returns {Function} Unsubscribe function
     */
    subscribeToQuotes(callback, errorCallback) {
        return this.subscribe([orderBy('lastModified', 'desc')], callback, errorCallback);
    }

    /**
     * Import multiple quotes from backup
     * @param {Array} quotes - Array of quote objects
     * @returns {Promise<boolean>} True if successful
     */
    async importQuotes(quotes) {
        const operations = quotes.map(quote => ({
            type: 'set',
            id: quote.id,
            data: quote
        }));

        return this.batchWrite(operations);
    }

    /**
     * Get next quote number based on existing quotes
     * @returns {Promise<string>} Next quote number (zero-padded)
     */
    async getNextQuoteNumber() {
        const quotes = await this.getAll();
        const maxQuoteNum = quotes.reduce((max, q) => {
            const num = parseInt(q.quoteNumber || '0', 10);
            return num > max ? num : max;
        }, 0);

        return (maxQuoteNum + 1).toString().padStart(4, '0');
    }

    /**
     * Update quote with auto-timestamp
     * @param {string} id - Quote ID
     * @param {Object} data - Quote data to update
     * @returns {Promise<Object>} Updated quote
     */
    async updateQuote(id, data) {
        const updateData = {
            ...data,
            lastModified: Date.now()
        };
        return this.update(id, updateData);
    }
}
