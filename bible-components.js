document.addEventListener('alpine:init', () => {
    Alpine.data('bibleSearch', () => ({
        // Core state
        searchInput: 'Romans 1',
        currentBook: 'Romans',
        currentChapter: 1,
        verses: [],
        loading: false,
        error: null,
        
        // Bible books array
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
        
        init() {
            console.log('🚀 Alpine component initialized');
            this.fetchVerses();
        },
        
        async fetchVerses() {
            this.loading = true;
            this.error = null;
            
            try {
                const url = `https://htkoxpvjdjzmxflaweet.supabase.co/rest/v1/bible_verses?book=eq.${this.currentBook}&chapter=eq.${this.currentChapter}&translation=eq.ASV&order=verse`;
                
                const response = await fetch(url, {
                    headers: {
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0a294cHZqZGp6bXhmbGF3ZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODU3MzcsImV4cCI6MjA2ODk2MTczN30.aAFZq_kyoOs_yepz-VTWOtWY6geU9S1I3YHDxgCoSPw',
                        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0a294cHZqZGp6bXhmbGF3ZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODU3MzcsImV4cCI6MjA2ODk2MTczN30.aAFZq_kyoOs_yepz-VTWOtWY6geU9S1I3YHDxgCoSPw'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                this.verses = data;
                console.log('✅ Loaded verses:', data.length);
                
            } catch (error) {
                console.error('❌ Fetch error:', error);
                this.error = 'Failed to load verses';
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
