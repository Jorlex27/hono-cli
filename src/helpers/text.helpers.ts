export const toCamelCase = (str: string): string => {
    if (!str) return '';

    const words = str.split(/[-_\s]+/).filter(Boolean);
    if (words.length === 0) return '';

    return words
        .map((word, index) =>
            index === 0
                ? word.toLowerCase()
                : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join('');
}

export const toPascalCase = (str: string): string => {
    if (!str) return '';

    const words = str.split(/[-_\s]+/).filter(Boolean);
    if (words.length === 0) return '';

    return words
        .map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join('');
}

export const toKebabCase = (str: string): string => {
    if (!str) return '';

    const words = str.split(/[-_\s]+/).filter(Boolean);
    if (words.length === 0) return '';

    return words
        .join('-')
        .toLowerCase();
}

export const toSnakeCase = (str: string): string => {
    if (!str) return '';
    return str.split(/[-_\s]+/).filter(Boolean).join('_').toLowerCase();
}

export const toConstantCase = (str: string): string => {
    if (!str) return '';
    return str.split(/[-_\s]+/).filter(Boolean).join('_').toUpperCase();
}

export const toTitleCase = (str: string): string => {
    if (!str) return '';
    return str.replace(/\w\S*/g, (word) => {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
}

export const toProperCase = (str: string): string => {
    if (!str) return '';
    return str
        .replace(/\w\S*/g, (word) => {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .replace(/\s+/g, '');
}

export const toUpperCase = (name: string) => name.toUpperCase().replace(/-/g, '_')

export const pluralize = (str: string): string => {
    if (!str) return '';

    // Split the name into words and filter out empty strings
    const words = str.split(/[-_\s]+/).filter(Boolean);
    if (words.length === 0) return '';

    const lastWord = words[words.length - 1];

    // Handle common irregular plurals
    const irregulars: Record<string, string> = {
        person: 'people',
        child: 'children',
        foot: 'feet',
        tooth: 'teeth',
        mouse: 'mice',
        criterion: 'criteria',
        analysis: 'analyses',
        datum: 'data',
        index: 'indices',
        matrix: 'matrices',
        vertex: 'vertices',
        status: 'statuses'
    };

    if (!lastWord) return str;

    const lastWord_lower = lastWord.toLowerCase();

    // Only pluralize the last word
    let pluralizedLastWord: string;

    // Check for irregular plurals first
    if (irregulars[lastWord_lower]) {
        pluralizedLastWord = irregulars[lastWord_lower];
    } else if (lastWord_lower.endsWith('s') &&
        (lastWord_lower.endsWith('ss') ||
            lastWord_lower.endsWith('us') ||
            lastWord_lower.endsWith('is'))) {
        pluralizedLastWord = lastWord;
    } else if (lastWord_lower.endsWith('y')) {
        const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
        const beforeY = lastWord_lower[lastWord_lower.length - 2];
        pluralizedLastWord = vowels.has(beforeY as string)
            ? `${lastWord}s`
            : `${lastWord.slice(0, -1)}ies`;
    } else if (lastWord_lower.endsWith('s') ||
        lastWord_lower.endsWith('sh') ||
        lastWord_lower.endsWith('ch') ||
        lastWord_lower.endsWith('x') ||
        lastWord_lower.endsWith('z')) {
        pluralizedLastWord = `${lastWord}es`;
    } else if (lastWord_lower.endsWith('fe')) {
        pluralizedLastWord = `${lastWord.slice(0, -2)}ves`;
    } else if (lastWord_lower.endsWith('f')) {
        pluralizedLastWord = `${lastWord.slice(0, -1)}ves`;
    } else {
        // Special cases for 'o' endings
        const oExceptions = new Set(['photo', 'piano', 'memo']);
        if (lastWord_lower.endsWith('o') && !oExceptions.has(lastWord_lower)) {
            pluralizedLastWord = `${lastWord}es`;
        } else {
            // Default case: just add 's'
            pluralizedLastWord = `${lastWord}s`;
        }
    }

    // Replace the last word with its plural form
    words[words.length - 1] = pluralizedLastWord;
    return words.join('-');
}