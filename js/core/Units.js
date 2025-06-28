/**
 * TyrexCAD Units System
 * Professional unit conversion and measurement system
 * 
 * Internal unit: millimeter (mm)
 * All internal calculations are performed in millimeters for precision
 */

class UnitsSystem {
    constructor() {
        // Conversion factors to millimeters (internal unit)
        this.conversionFactors = {
            // Metric units
            'nm': 0.000001,      // nanometer
            'um': 0.001,         // micrometer (micron)
            'mm': 1,             // millimeter (base unit)
            'cm': 10,            // centimeter
            'dm': 100,           // decimeter
            'm': 1000,           // meter
            'km': 1000000,       // kilometer
            
            // Imperial units
            'mil': 0.0254,       // mil (thou) = 1/1000 inch
            'in': 25.4,          // inch
            'ft': 304.8,         // foot = 12 inches
            'yd': 914.4,         // yard = 3 feet
            'mi': 1609344,       // mile = 5280 feet
            
            // Typography units
            'pt': 0.352778,      // point = 1/72 inch
            'px': 0.264583       // pixel at 96 DPI = 1/96 inch
        };
        
        // Unit display names
        this.unitNames = {
            'nm': 'nanometer',
            'um': 'micrometer',
            'mm': 'millimeter',
            'cm': 'centimeter',
            'dm': 'decimeter',
            'm': 'meter',
            'km': 'kilometer',
            'mil': 'mil',
            'in': 'inch',
            'ft': 'foot',
            'yd': 'yard',
            'mi': 'mile',
            'pt': 'point',
            'px': 'pixel'
        };
        
        // Unit symbols (for display)
        this.unitSymbols = {
            'nm': 'nm',
            'um': 'μm',
            'mm': 'mm',
            'cm': 'cm',
            'dm': 'dm',
            'm': 'm',
            'km': 'km',
            'mil': 'mil',
            'in': '″',
            'ft': '′',
            'yd': 'yd',
            'mi': 'mi',
            'pt': 'pt',
            'px': 'px'
        };
        
        // Unit categories
        this.unitCategories = {
            metric: ['nm', 'um', 'mm', 'cm', 'dm', 'm', 'km'],
            imperial: ['mil', 'in', 'ft', 'yd', 'mi'],
            typography: ['pt', 'px']
        };
        
        // Default precision for each unit
        this.defaultPrecision = {
            'nm': 0,
            'um': 3,
            'mm': 2,
            'cm': 3,
            'dm': 3,
            'm': 4,
            'km': 6,
            'mil': 2,
            'in': 4,
            'ft': 4,
            'yd': 4,
            'mi': 6,
            'pt': 2,
            'px': 0
        };
        
        // Common unit patterns for parsing
        this.unitPatterns = [
            // Full names
            /(\d+\.?\d*)\s*(nanometers?|nm)/i,
            /(\d+\.?\d*)\s*(micrometers?|microns?|um|μm)/i,
            /(\d+\.?\d*)\s*(millimeters?|mm)/i,
            /(\d+\.?\d*)\s*(centimeters?|cm)/i,
            /(\d+\.?\d*)\s*(decimeters?|dm)/i,
            /(\d+\.?\d*)\s*(meters?|m)(?!m|i)/i,
            /(\d+\.?\d*)\s*(kilometers?|km)/i,
            /(\d+\.?\d*)\s*(mils?|thou)/i,
            /(\d+\.?\d*)\s*(inch|inches|in|″|")/i,
            /(\d+\.?\d*)\s*(foot|feet|ft|′|')/i,
            /(\d+\.?\d*)\s*(yards?|yd)/i,
            /(\d+\.?\d*)\s*(miles?|mi)/i,
            /(\d+\.?\d*)\s*(points?|pt)/i,
            /(\d+\.?\d*)\s*(pixels?|px)/i
        ];
        
        // Unit mapping for parsing
        this.unitMapping = {
            // Metric
            'nanometer': 'nm', 'nanometers': 'nm', 'nm': 'nm',
            'micrometer': 'um', 'micrometers': 'um', 'micron': 'um', 'microns': 'um', 'um': 'um', 'μm': 'um',
            'millimeter': 'mm', 'millimeters': 'mm', 'mm': 'mm',
            'centimeter': 'cm', 'centimeters': 'cm', 'cm': 'cm',
            'decimeter': 'dm', 'decimeters': 'dm', 'dm': 'dm',
            'meter': 'm', 'meters': 'm', 'm': 'm',
            'kilometer': 'km', 'kilometers': 'km', 'km': 'km',
            // Imperial
            'mil': 'mil', 'mils': 'mil', 'thou': 'mil',
            'inch': 'in', 'inches': 'in', 'in': 'in', '″': 'in', '"': 'in',
            'foot': 'ft', 'feet': 'ft', 'ft': 'ft', '′': 'ft', "'": 'ft',
            'yard': 'yd', 'yards': 'yd', 'yd': 'yd',
            'mile': 'mi', 'miles': 'mi', 'mi': 'mi',
            // Typography
            'point': 'pt', 'points': 'pt', 'pt': 'pt',
            'pixel': 'px', 'pixels': 'px', 'px': 'px'
        };
    }
    
    /**
     * Convert a value from any unit to internal unit (mm)
     * @param {number} value - The value to convert
     * @param {string} fromUnit - The unit to convert from
     * @returns {number} Value in millimeters
     * @throws {Error} If unit is not supported
     */
    toInternal(value, fromUnit) {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error('Value must be a valid number');
        }
        
        const unit = this.normalizeUnit(fromUnit);
        if (!this.conversionFactors.hasOwnProperty(unit)) {
            throw new Error(`Unsupported unit: ${fromUnit}`);
        }
        
        return value * this.conversionFactors[unit];
    }
    
    /**
     * Convert a value from internal unit (mm) to any unit
     * @param {number} value - The value in millimeters
     * @param {string} toUnit - The unit to convert to
     * @returns {number} Value in target unit
     * @throws {Error} If unit is not supported
     */
    fromInternal(value, toUnit) {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error('Value must be a valid number');
        }
        
        const unit = this.normalizeUnit(toUnit);
        if (!this.conversionFactors.hasOwnProperty(unit)) {
            throw new Error(`Unsupported unit: ${toUnit}`);
        }
        
        return value / this.conversionFactors[unit];
    }
    
    /**
     * Convert a value directly between two units
     * @param {number} value - The value to convert
     * @param {string} fromUnit - The unit to convert from
     * @param {string} toUnit - The unit to convert to
     * @returns {number} Converted value
     * @throws {Error} If units are not supported
     */
    convert(value, fromUnit, toUnit) {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error('Value must be a valid number');
        }
        
        const from = this.normalizeUnit(fromUnit);
        const to = this.normalizeUnit(toUnit);
        
        if (from === to) {
            return value; // No conversion needed
        }
        
        // Convert through internal unit (mm)
        const internalValue = this.toInternal(value, from);
        return this.fromInternal(internalValue, to);
    }
    
    /**
     * Format a value with unit for display
     * @param {number} value - The value to format
     * @param {string} unit - The unit
     * @param {number} [precision] - Number of decimal places (optional)
     * @returns {string} Formatted string with value and unit
     */
    format(value, unit, precision = null) {
        if (typeof value !== 'number' || isNaN(value)) {
            return 'Invalid';
        }
        
        const normalizedUnit = this.normalizeUnit(unit);
        const p = precision !== null ? precision : this.defaultPrecision[normalizedUnit];
        const formattedValue = value.toFixed(p);
        const symbol = this.unitSymbols[normalizedUnit];
        
        return `${formattedValue} ${symbol}`;
    }
    
    /**
     * Parse user input to extract value and unit
     * @param {string} userInput - User input string
     * @returns {Object|null} Object with {value, unit} or null if parsing fails
     */
    parseInput(userInput) {
        if (typeof userInput !== 'string') {
            return null;
        }
        
        const input = userInput.trim();
        
        // Try to match against known patterns
        for (const pattern of this.unitPatterns) {
            const match = input.match(pattern);
            if (match) {
                const value = parseFloat(match[1]);
                const unitStr = match[2].toLowerCase();
                const unit = this.unitMapping[unitStr];
                
                if (!isNaN(value) && unit) {
                    return { value, unit };
                }
            }
        }
        
        // Try simple number parsing (no unit specified)
        const numberMatch = input.match(/^(\d+\.?\d*)$/);
        if (numberMatch) {
            const value = parseFloat(numberMatch[1]);
            if (!isNaN(value)) {
                return { value, unit: null };
            }
        }
        
        return null;
    }
    
    /**
     * Normalize unit string to standard format
     * @param {string} unit - Unit string to normalize
     * @returns {string} Normalized unit
     */
    normalizeUnit(unit) {
        if (typeof unit !== 'string') {
            throw new Error('Unit must be a string');
        }
        
        const normalized = unit.toLowerCase().trim();
        return this.unitMapping[normalized] || normalized;
    }
    
    /**
     * Get all available units
     * @returns {Array} Array of unit codes
     */
    getAvailableUnits() {
        return Object.keys(this.conversionFactors);
    }
    
    /**
     * Get units by category
     * @param {string} category - Category name (metric, imperial, typography)
     * @returns {Array} Array of unit codes in category
     */
    getUnitsByCategory(category) {
        return this.unitCategories[category] || [];
    }
    
    /**
     * Get unit information
     * @param {string} unit - Unit code
     * @returns {Object} Unit information
     */
    getUnitInfo(unit) {
        const normalized = this.normalizeUnit(unit);
        
        if (!this.conversionFactors.hasOwnProperty(normalized)) {
            return null;
        }
        
        return {
            code: normalized,
            name: this.unitNames[normalized],
            symbol: this.unitSymbols[normalized],
            category: this.getUnitCategory(normalized),
            conversionFactor: this.conversionFactors[normalized],
            defaultPrecision: this.defaultPrecision[normalized]
        };
    }
    
    /**
     * Get unit category
     * @param {string} unit - Unit code
     * @returns {string|null} Category name or null
     */
    getUnitCategory(unit) {
        const normalized = this.normalizeUnit(unit);
        
        for (const [category, units] of Object.entries(this.unitCategories)) {
            if (units.includes(normalized)) {
                return category;
            }
        }
        
        return null;
    }
    
    /**
     * Check if unit is valid
     * @param {string} unit - Unit to check
     * @returns {boolean} True if unit is valid
     */
    isValidUnit(unit) {
        try {
            const normalized = this.normalizeUnit(unit);
            return this.conversionFactors.hasOwnProperty(normalized);
        } catch {
            return false;
        }
    }
    
    /**
     * Calculate scale factor between two units
     * @param {string} fromUnit - Source unit
     * @param {string} toUnit - Target unit
     * @returns {number} Scale factor
     */
    getScaleFactor(fromUnit, toUnit) {
        const from = this.normalizeUnit(fromUnit);
        const to = this.normalizeUnit(toUnit);
        
        if (!this.conversionFactors.hasOwnProperty(from) || !this.conversionFactors.hasOwnProperty(to)) {
            throw new Error('Invalid units');
        }
        
        return this.conversionFactors[from] / this.conversionFactors[to];
    }
    
    /**
     * Round value to appropriate precision for unit
     * @param {number} value - Value to round
     * @param {string} unit - Unit for precision
     * @returns {number} Rounded value
     */
    roundToPrecision(value, unit) {
        const normalized = this.normalizeUnit(unit);
        const precision = this.defaultPrecision[normalized] || 2;
        const factor = Math.pow(10, precision);
        return Math.round(value * factor) / factor;
    }
    
    /**
     * Get the best unit for a value (auto-scaling)
     * @param {number} valueInMm - Value in millimeters
     * @param {string} preferredSystem - 'metric' or 'imperial'
     * @returns {Object} {value, unit} with best unit
     */
    getBestUnit(valueInMm, preferredSystem = 'metric') {
        const units = preferredSystem === 'imperial' 
            ? ['mi', 'yd', 'ft', 'in', 'mil']
            : ['km', 'm', 'cm', 'mm', 'um', 'nm'];
        
        for (const unit of units) {
            const converted = this.fromInternal(valueInMm, unit);
            if (converted >= 1 && converted < 1000) {
                return {
                    value: this.roundToPrecision(converted, unit),
                    unit: unit
                };
            }
        }
        
        // Default to mm or inches
        const defaultUnit = preferredSystem === 'imperial' ? 'in' : 'mm';
        return {
            value: this.roundToPrecision(this.fromInternal(valueInMm, defaultUnit), defaultUnit),
            unit: defaultUnit
        };
    }
    
    /**
     * Format value with best unit
     * @param {number} valueInMm - Value in millimeters
     * @param {string} preferredSystem - 'metric' or 'imperial'
     * @returns {string} Formatted string
     */
    formatBest(valueInMm, preferredSystem = 'metric') {
        const best = this.getBestUnit(valueInMm, preferredSystem);
        return this.format(best.value, best.unit);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnitsSystem;
}
window.UnitsSystem = UnitsSystem;
export { UnitsSystem };