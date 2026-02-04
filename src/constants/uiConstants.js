// UI-related constants and messages

export const MAX_UNDO_STACK_SIZE = 10;

export const DEFAULT_SITE_FORM = {
    id: null,
    name: '',
    customer: '',
    location: '',
    fullLocation: '',
    streetAddress: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Australia',
    gpsCoordinates: '',
    type: 'Mine',
    typeDetail: '',
    contactName: '',
    contactEmail: '',
    contactPosition: '',
    contactPhone1: '',
    contactPhone2: '',
    active: true,
    notes: [],
    logo: null,
    issues: []
};

export const DEFAULT_NOTE_INPUT = { content: '', author: '' };

export const DEFAULT_NEW_ASSET = {
    name: '',
    weigher: '',
    code: '',
    lastCal: '',
    frequency: ''
};

export const DEFAULT_SPEC_NOTE_INPUT = { content: '', author: '' };
