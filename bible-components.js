document.addEventListener('alpine:init', () => {
    Alpine.data('bibleSearch', () => ({
        // Core state
        searchInput: '',
        currentBook: 'Romans',
        currentChapter: 1,
        verses: [],
        loading: false,
        error: null,
        
        // Bible books for validation (using Arabic numerals - standard format)
        bibleBooks: [
            'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
            'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
            '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
            'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
            'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
            'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel',
            'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
            'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
            'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans',
            '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
            'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
            '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebreus',
            'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
            'Jude', 'Revelation'
        ],
        
        // Book abbreviations (using standard Arabic numerals)
        bookAbbreviations: {
            'gen': 'Genesis', 'ex': 'Exodus', 'lev': 'Leviticus',
            'num': 'Numbers', 'deut': 'Deuteronomy', 'josh': 'Joshua',
            'judg': 'Judges', 'ruth': 'Ruth', '1sam': '1 Samuel',
            '2sam': '2 Samuel', '1kgs': '1 Kings', '2kgs': '2 Kings',
            '1chr': '1 Chronicles', '2chr': '2 Chronicles',
            'matt': 'Matthew', 'mk': 'Mark', 'luke': 'Luke',
            'john': 'John', 'acts': 'Acts', 'rom': 'Romans',
            '1cor': '1 Corinthians', '2cor': '2 Corinthians',
            'gal': 'Galatians', 'eph': 'Ephesians', 'phil': 'Philippians',
            'col': 'Colossians', '1thess': '1 Thessalonians',
            '2thess': '2 Thessalonians', '1tim': '1 Timothy',
            '2tim': '2 Timothy', 'titus': 'Titus', 'phlm': 'Philemon',
            'heb': 'Hebrews', 'jas': 'James', '1pet': '1 Peter',
            '2pet': '2 Peter', '1john': '1 John', '2john': '2 John',
            '3john': '3 John', 'jude': 'Jude', 'rev': 'Revelation'
        ],
        
        init() {
            this.searchInput = `${this.currentBook} ${this.currentChapter}`;
            this.fetchVerses();
        },
        
        // Enhanced parser with better error handling
        parseReference() {
            const input = this.searchInput.trim();
            
            if (!input) {
                return { isValid: false, error: 'Please enter a reference' };
            }
            
            // Try different patterns in specific order (most specific first)
            const patterns = [
                // "1 Corinthians 8:28" (numbered book with verse)
                { regex: /^(\d+)\s+(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/i, type: 'numbered_book_verse' },
                // "Romans 8:28" or "Romans 8:28-31" (regular book with verse)
                { regex: /^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/i, type: 'verse' },
                // "1 Corinthians 8" (numbered book with chapter)
                { regex: /^(\d+)\s+(.+?)\s+(\d+)$/i, type: 'numbered_book_chapter' },
                // "Romans 8" (regular book with chapter)
                { regex: /^(.+?)\s+(\d+)$/i, type: 'chapter' },
                // "1 Corinthians" or "Romans" (book name only)
                { regex: /^(.+)$/i, type: 'book' }
            ];
            
            for (let pattern of patterns) {
                const match = input.match(pattern.regex);
                if (match) {
                    let book, chapter;
                    
                    switch (pattern.type) {
                        case 'numbered_book_verse':
                            book = this.normalizeBookName(`${match[1]} ${match[2]}`);
                            chapter = parseInt(match[3]);
                            break;
                            
                        case 'verse':
                            book = this.normalizeBookName(match[1]);
                            chapter = parseInt(match[2]);
                            break;
                            
                        case 'numbered_book_chapter':
                            book = this.normalizeBookName(`${match[1]} ${match[2]}`);
                            chapter = parseInt(match[3]);
                            break;
                            
                        case 'chapter':
                            book = this.normalizeBookName(match[1]);
                            chapter = parseInt(match[2]);
                            break;
                            
                        case 'book':
                            book = this.normalizeBookName(match[1]);
                            chapter = 1;
                            break;
                    }
                    
                    if (this.isValidBook(book)) {
                        return { isValid: true, book, chapter };
                    } else {
                        // Continue to try other patterns instead of failing immediately
                        continue;
                    }
                }
            }
            
            return { isValid: false, error: 'Invalid reference format' };
        },
        
        // Normalize book names and handle abbreviations
        normalizeBookName(bookInput) {
            const normalized = bookInput.toLowerCase().trim();
            
            // Check abbreviations first
            if (this.bookAbbreviations[normalized]) {
                return this.bookAbbreviations[normalized];
            }
            
            // Try to find exact match (case insensitive)
            const exactMatch = this.bibleBooks.find(book => 
                book.toLowerCase() === normalized
            );
            if (exactMatch) return exactMatch;
            
            // Try to find partial match
            const partialMatch = this.bibleBooks.find(book => 
                book.toLowerCase().includes(normalized) || 
                normalized.includes(book.toLowerCase())
            );
            if (partialMatch) return partialMatch;
            
            // Return original input if no match found
            return bookInput;
        },
        
        // Check if book name is valid
        isValidBook(book) {
            return this.bibleBooks.includes(book);
        },
        
        // Handle search with validation
        onSearchEnter() {
            const parsed = this.parseReference();
            
            if (!parsed.isValid) {
                this.error = parsed.error;
                return;
            }
            
            this.currentBook = parsed.book;
            this.currentChapter = parsed.chapter;
            this.error = null;
            this.fetchVerses();
        },
        
        // Fetch verses from API
        async fetchVerses() {
            this.loading = true;
            
            try {
                const url = `https://htkoxpvjdjzmxflaweet.supabase.co/rest/v1/bible_verses?book=eq.${this.currentBook}&chapter=eq.${this.currentChapter}&translation=eq.ASV&order=verse`;
                
                const response = await fetch(url, {
                    headers: {
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0a294cHZqZGp6bXhmbGF3ZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODU3MzcsImV4cCI6MjA2ODk2MTczN30.aAFZq_kyoOs_yepz-VTWOtWY6geU9S1I3YHDxgCoSPw',
                        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0a294cHZqZGp6bXhmbGF3ZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODU3MzcsImV4cCI6MjA2ODk2MTczN30.aAFZq_kyoOs_yepz-VTWOtWY6geU9S1I3YHDxgCoSPw',
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.length === 0) {
                    this.error = `No verses found for ${this.currentBook} ${this.currentChapter}`;
                    this.verses = [];
                } else {
                    this.verses = data;
                    this.searchInput = `${this.currentBook} ${this.currentChapter}`;
                    this.error = null;
                }
                
            } catch (error) {
                this.error = 'Failed to load verses. Please try again.';
                this.verses = [];
            } finally {
                this.loading = false;
            }
        },
        
        updateSuggestions() {
            // Placeholder for autocomplete functionality
        },
        
        // Navigation helpers
        previousChapter() {
            if (this.currentChapter > 1) {
                this.currentChapter--;
                this.searchInput = `${this.currentBook} ${this.currentChapter}`;
                this.fetchVerses();
            }
        },
        
        nextChapter() {
            this.currentChapter++;
            this.searchInput = `${this.currentBook} ${this.currentChapter}`;
            this.fetchVerses();
        }
    }));
});