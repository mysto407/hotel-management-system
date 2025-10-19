// src/utils/fieldConverter.js

// Convert camelCase to snake_case
export const toSnakeCase = (str) => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

// Convert snake_case to camelCase
export const toCamelCase = (str) => {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
};

// Convert object keys from camelCase to snake_case
export const objectToSnakeCase = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(objectToSnakeCase);
    if (typeof obj !== 'object') return obj;

    return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = toSnakeCase(key);
        acc[snakeKey] = objectToSnakeCase(obj[key]);
        return acc;
    }, {});
};

// Convert object keys from snake_case to camelCase
export const objectToCamelCase = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(objectToCamelCase);
    if (typeof obj !== 'object') return obj;

    return Object.keys(obj).reduce((acc, key) => {
        const camelKey = toCamelCase(key);
        acc[camelKey] = objectToCamelCase(obj[key]);
        return acc;
    }, {});
};

// Example usage:
// const dbData = { room_number: '101', room_type_id: 'uuid' }
// const frontendData = objectToCamelCase(dbData)
// // Result: { roomNumber: '101', roomTypeId: 'uuid' }

// const formData = { roomNumber: '101', roomTypeId: 'uuid' }
// const dbData = objectToSnakeCase(formData)
// // Result: { room_number: '101', room_type_id: 'uuid' }