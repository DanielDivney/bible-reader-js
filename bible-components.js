document.addEventListener('alpine:init', () => {
    Alpine.data('bibleSearch', () => ({
        searchInput: 'Romans 1',
        currentBook: 'Romans',
        currentChapter: 1,
        verses: [],
        loading: false,
        error: null,
        
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
            '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
            'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
            'Jude', 'Revelation'
        ],
        
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
        },
        
        init() {
            this.fetchVerses();
        },
        
        parseReference() {
            const input = this.searchInput.trim();
            
            if (!input) {
                return { isValid: false, error: 'Please enter a reference' };
            }
            
            const patterns = [
                { regex: /^(\d+)\s+(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/i, type: 'numbered_book_verse' },
                { regex: /^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/i, type: 'verse' },
                { regex: /^(\d+)\s+(.+?)\s+(\d+)$/i, type: 'numbered_book_chapter' },
                { regex: /^(.+?)\s+(\d+)$/i, type: 'chapter' },
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
                        continue;
                    }
                }
            }
            
            return { isValid: false, error: 'Invalid reference format' };
        },
        
        normalizeBookName(bookInput) {
            const normalized = bookInput.toLowerCase().trim();
            
            if (this.bookAbbreviations[normalized]) {
                return this.bookAbbreviations[normalized];
            }
            
            const exactMatch = this.bibleBooks.find(book => 
                book.toLowerCase() === normalized
            );
            if (exactMatch) return exactMatch;
            
            const partialMatch = this.bibleBooks.find(book => 
                book.toLowerCase().includes(normalized) || 
                normalized.includes(book.toLowerCase())
            );
            if (partialMatch) return partialMatch;
            
            return bookInput;
        },
        
        isValidBook(book) {
            return this.bibleBooks.includes(book);
        },
        
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
        
        async fetchVerses() {
            this.loading = true;
            this.error = null;
            
            try {
                const response = await fetch(`https://htkoxpvjdjzmxflaweet.supabase.co/rest/v1/bible_verses?book=eq.${this.currentBook}&chapter=eq.${this.currentChapter}&translation=eq.ASV&order=verse`, {
                    headers: {
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0a294cHZqZGp6bXhmbGF3ZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODU3MzcsImV4cCI6MjA2ODk2MTczN30.aAFZq_kyoOs_yepz-VTWOtWY6geU9S1I3YHDxgCoSPw',
                        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0a294cHZqZGp6bXhmbGF3ZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODU3MzcsImV4cCI6MjA2ODk2MTczN30.aAFZq_kyoOs_yepz-VTWOtWY6geU9S1I3YHDxgCoSPw'
                    }
                });
                
                if (!response.ok) throw new Error(`API error: ${response.status}`);
                
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
                this.error = 'Failed to load verses';
                this.verses = [];
            } finally {
                this.loading = false;
            }
        },
        
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
