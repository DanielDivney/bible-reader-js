setTimeout(function() {
 Vue.createApp({
   data() {
     return {
       // Tab system
       tabs: [
         {
           id: 'tab-1',
           title: 'Romans 1',
           currentBook: 'Romans',
           currentChapter: 1,
           allVerses: [],
           searchInput: 'Romans 1',
           loading: false,
           error: null
         }
       ],
       activeTabId: 'tab-1',
       nextTabId: 2,
       hoveredTabId: null,
       
       // Verse tracking system
       verseObserver: null,
       currentPosition: {
         book: 'Romans',
         chapter: 1,
         verse: null
       },
       loadedChapters: new Set(),
       isLoadingAdditional: false,
       
       // Bible data - loaded from database instead of hardcoded
       bibleBooks: [],
       bookAbbreviations: new Map(),
       
       // Loading states
       booksLoading: false,
       abbreviationsLoading: false
     }
   },
   computed: {
     activeTab() {
       return this.tabs.find(tab => tab.id === this.activeTabId)
     },
     
     sortedVerses() {
       const tab = this.activeTab
       if (!tab || !tab.allVerses) return []
       
       // Check if we have multiple books (cross-book navigation)
       const uniqueBooks = [...new Set(tab.allVerses.map(v => v.book))]
       
       if (uniqueBooks.length > 1) {
         // Multiple books - preserve API order for cross-book navigation
         return tab.allVerses
       } else {
         // Single book - sort by chapter, then verse
         return tab.allVerses.sort((a, b) => {
           if (a.chapter !== b.chapter) return a.chapter - b.chapter
           return a.verse - b.verse
         })
       }
     },
     
     groupedBooks() {
       const verses = this.sortedVerses
       if (!verses.length) return []
       
       // Group verses by book, then by chapter
       const books = {}
       verses.forEach(verse => {
         if (!books[verse.book]) {
           books[verse.book] = {
             book: verse.book,
             chapters: {},
             firstVerseIndex: verses.indexOf(verse)
           }
         }
         
         if (!books[verse.book].chapters[verse.chapter]) {
           books[verse.book].chapters[verse.chapter] = {
             chapter: verse.chapter,
             verses: []
           }
         }
         
         books[verse.book].chapters[verse.chapter].verses.push(verse)
       })
       
       // Convert to array format and preserve original verse order
       return Object.values(books)
         .sort((a, b) => a.firstVerseIndex - b.firstVerseIndex)
         .map(book => ({
           book: book.book,
           chapters: Object.values(book.chapters).sort((a, b) => a.chapter - b.chapter)
         }))
     }
   },
   methods: {
     // Database loading methods
     async loadBibleBooks() {
       if (this.booksLoading) return
       this.booksLoading = true
       
       try {
         const response = await fetch('https://htkoxpvjdjzmxflaweet.supabase.co/rest/v1/bible_books?order=book_order', {
           headers: {
             'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0a294cHZqZGp6bXhmbGF3ZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODU3MzcsImV4cCI6MjA2ODk2MTczN30.aAFZq_kyoOs_yepz-VTWOtWY6geU9S1I3YHDxgCoSPw',
             'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0a294cHZqZGp6bXhmbGF3ZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODU3MzcsImV4cCI6MjA2ODk2MTczN30.aAFZq_kyoOs_yepz-VTWOtWY6geU9S1I3YHDxgCoSPw'
           }
         })
         
         if (!response.ok) throw new Error(`Failed to load Bible books: ${response.status}`)
         
         const data = await response.json()
         this.bibleBooks = data.map(book => ({
           name: book.book_name,
           order: book.book_order,
           chapters: book.total_chapters,
           testament: book.testament
         }))
         
         console.log(`Loaded ${this.bibleBooks.length} Bible books from database`)
         
       } catch (error) {
         console.error('Error loading Bible books:', error)
       } finally {
         this.booksLoading = false
       }
     },
     
     async loadBookAbbreviations() {
       if (this.abbreviationsLoading) return
       this.abbreviationsLoading = true
       
       try {
         const response = await fetch('https://htkoxpvjdjzmxflaweet.supabase.co/rest/v1/book_abbreviations?select=book_name,abbreviation', {
           headers: {
             'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0a294cHZqZGp6bXhmbGF3ZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODU3MzcsImV4cCI6MjA2ODk2MTczN30.aAFZq_kyoOs_yepz-VTWOtWY6geU9S1I3YHDxgCoSPw',
             'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0a294cHZqZGp6bXhmbGF3ZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODU3MzcsImV4cCI6MjA2ODk2MTczN30.aAFZq_kyoOs_yepz-VTWOtWY6geU9S1I3YHDxgCoSPw'
           }
         })
         
         if (!response.ok) throw new Error(`Failed to load book abbreviations: ${response.status}`)
         
         const data = await response.json()
         
         // Build Map for O(1) lookups
         this.bookAbbreviations.clear()
         data.forEach(item => {
           this.bookAbbreviations.set(item.abbreviation.toLowerCase(), item.book_name)
         })
         
         console.log(`Loaded ${data.length} book abbreviations from database`)
         
       } catch (error) {
         console.error('Error loading book abbreviations:', error)
       } finally {
         this.abbreviationsLoading = false
       }
     },
     
     // Verse tracking system
     setupVerseTracking() {
       if (this.verseObserver) {
         this.verseObserver.disconnect()
       }
       
       this.verseObserver = new IntersectionObserver((entries) => {
         const visibleVerseNumbers = entries
           .filter(entry => entry.isIntersecting)
           .map(entry => {
             const verseElement = entry.target.closest('[data-chapter][data-verse]')
             if (!verseElement) return null
             
             const book = this.getBookFromVerseElement(verseElement)
             const chapter = parseInt(verseElement.dataset.chapter)
             const verse = parseInt(verseElement.dataset.verse)
             
             return {
               book,
               chapter,
               verse,
               top: entry.boundingClientRect.top,
               element: verseElement
             }
           })
           .filter(item => item !== null)
           .sort((a, b) => a.top - b.top)
         
         if (visibleVerseNumbers.length > 0) {
           const topVerse = visibleVerseNumbers[0]
           this.updateCurrentPosition(topVerse)
         }
       }, {
         root: null,
         rootMargin: '0px 0px -80% 0px',
         threshold: 0.1
       })
       
       this.$nextTick(() => {
         document.querySelectorAll('[data-chapter][data-verse] .verse-number, [data-chapter][data-verse]').forEach(verseEl => {
           this.verseObserver.observe(verseEl)
         })
       })
     },
     
     getBookFromVerseElement(verseElement) {
       const chapter = parseInt(verseElement.dataset.chapter)
       const verse = parseInt(verseElement.dataset.verse)
       
       const tab = this.activeTab
       if (tab && tab.allVerses) {
         const verseData = tab.allVerses.find(v => v.chapter === chapter && v.verse === verse)
         return verseData ? verseData.book : this.currentPosition.book
       }
       
       return this.currentPosition.book
     },
     
     updateCurrentPosition(verseData) {
       const { book, chapter, verse } = verseData
       
       this.currentPosition = { book, chapter, verse }
       this.updateSearchInputFromPosition()
       this.checkForAdjacentChapterLoading(chapter)
     },
     
     updateSearchInputFromPosition() {
       const tab = this.activeTab
       if (!tab) return
       
       const { book, chapter, verse } = this.currentPosition
       
       tab.searchInput = `${book} ${chapter}:${verse}`
       tab.title = `${book} ${chapter}`
     },
     
     checkForAdjacentChapterLoading(currentChapter) {
       if (this.isLoadingAdditional) return
       
       const tab = this.activeTab
       if (!tab) return
       
       const currentBookVerses = tab.allVerses.filter(v => v.book === this.currentPosition.book)
       const loadedChapters = [...new Set(currentBookVerses.map(v => v.chapter))].sort((a, b) => a - b)
       
       if (loadedChapters.length === 0) return
       
       const minLoaded = Math.min(...loadedChapters)
       const maxLoaded = Math.max(...loadedChapters)
       
       if (currentChapter === maxLoaded) {
         this.loadAdjacentChapter('forward', this.currentPosition.book, maxLoaded)
       }
       
       if (currentChapter === minLoaded) {
         this.loadAdjacentChapter('backward', this.currentPosition.book, minLoaded)
       }
     },
     
     async loadAdjacentChapter(direction, currentBook, currentChapter) {
       if (this.isLoadingAdditional) return
       
       this.isLoadingAdditional = true
       
       try {
         let targetBook, targetChapter
         
         if (direction === 'forward') {
           const bookInfo = this.getBookInfo(currentBook)
           if (!bookInfo) return
           
           if (currentChapter < bookInfo.chapters) {
             targetBook = currentBook
             targetChapter = currentChapter + 1
           } else {
             const nextBook = this.getNextBook(currentBook)
             if (nextBook) {
               targetBook = nextBook.name
               targetChapter = 1
             }
           }
         } else {
           if (currentChapter > 1) {
             targetBook = currentBook
             targetChapter = currentChapter - 1
           } else {
             const prevBook = this.getPreviousBook(currentBook)
             if (prevBook) {
               targetBook = prevBook.name
               targetChapter = prevBook.chapters
             }
           }
         }
         
         if (targetBook && targetChapter) {
           const chapterKey = `${targetBook}-${targetChapter}`
           
           if (this.loadedChapters.has(chapterKey)) {
             return
           }
           
           console.log(`Loading ${direction} chapter: ${targetBook} ${targetChapter}`)
           
           await this.loadSingleChapter(targetBook, targetChapter)
           this.loadedChapters.add(chapterKey)
         }
         
       } catch (error) {
         console.error('Error loading adjacent chapter:', error)
       } finally {
         this.isLoadingAdditional = false
       }
     },
     
     async loadSingleChapter(book, chapter) {
       try {
         const response = await fetch(`https://htkoxpvjdjzmxflaweet.supabase.co/rest/v1/bible_verses?book=eq.${book}&chapter=eq.${chapter}&translation=eq.ASV&order=verse`, {
           headers: {
             'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0a294cHZqZGp6bXhmbGF3ZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODU3MzcsImV4cCI6MjA2ODk2MTczN30.aAFZq_kyoOs_yepz-VTWOtWY6geU9S1I3YHDxgCoSPw',
             'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0a294cHZqZGp6bXhmbGF3ZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODU3MzcsImV4cCI6MjA2ODk2MTczN30.aAFZq_kyoOs_yepz-VTWOtWY6geU9S1I3YHDxgCoSPw'
           }
         })
         
         if (response.ok) {
           const newVerses = await response.json()
           
           if (newVerses.length > 0) {
             const tab = this.activeTab
             
             tab.allVerses = [...tab.allVerses, ...newVerses]
             
             this.$nextTick(() => {
               this.setupVerseTracking()
             })
             
             console.log(`Successfully loaded: ${book} ${chapter} (${newVerses.length} verses)`)
           }
         }
       } catch (error) {
         console.error(`Error loading chapter ${book} ${chapter}:`, error)
       }
     },
     
     initializeLoadedChapters() {
       const tab = this.activeTab
       if (tab && tab.allVerses) {
         this.loadedChapters.clear()
         const chapters = [...new Set(tab.allVerses.map(v => `${v.book}-${v.chapter}`))]
         chapters.forEach(key => this.loadedChapters.add(key))
       }
     },
     
     // Book info methods
     getBookInfo(bookName) {
       return this.bibleBooks.find(book => book.name === bookName)
     },
     
     getPreviousBook(currentBook) {
       const currentBookInfo = this.getBookInfo(currentBook)
       if (!currentBookInfo || currentBookInfo.order === 1) return null
       
       return this.bibleBooks.find(book => book.order === currentBookInfo.order - 1)
     },
     
     getNextBook(currentBook) {
       const currentBookInfo = this.getBookInfo(currentBook)
       if (!currentBookInfo || currentBookInfo.order === 66) return null
       
       return this.bibleBooks.find(book => book.order === currentBookInfo.order + 1)
     },
     
     buildCrossBookQuery(currentBook, currentChapter) {
       const currentBookInfo = this.getBookInfo(currentBook)
       if (!currentBookInfo) return null
       
       const queries = []
       
       const prevChapter = Math.max(1, currentChapter - 1)
       const nextChapter = Math.min(currentBookInfo.chapters, currentChapter + 1)
       
       const currentBookChapters = [prevChapter, currentChapter, nextChapter]
         .filter((c, i, arr) => arr.indexOf(c) === i)
       
       queries.push({
         book: currentBook,
         chapters: currentBookChapters
       })
       
       if (currentChapter === 1) {
         const prevBook = this.getPreviousBook(currentBook)
         if (prevBook) {
           queries.unshift({
             book: prevBook.name,
             chapters: [prevBook.chapters]
           })
         }
       }
       
       if (currentChapter === currentBookInfo.chapters) {
         const nextBook = this.getNextBook(currentBook)
         if (nextBook) {
           queries.push({
             book: nextBook.name,
             chapters: [1]
           })
         }
       }
       
       return queries
     },
     
     async fetchVerses(tabId) {
       const tab = this.tabs.find(t => t.id === tabId)
       if (!tab) return
       
       tab.loading = true
       tab.error = null
       
       try {
         const queries = this.buildCrossBookQuery(tab.currentBook, tab.currentChapter)
         if (!queries) {
           tab.error = 'Invalid book name'
           return
         }
         
         let allVerses = []
         
         for (const query of queries) {
           const chapterQuery = query.chapters.map(c => `chapter.eq.${c}`).join(',')
           
           const response = await fetch(`https://htkoxpvjdjzmxflaweet.supabase.co/rest/v1/bible_verses?book=eq.${query.book}&or=(${chapterQuery})&translation=eq.ASV&order=chapter,verse`, {
             headers: {
               'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0a294cHZqZGp6bXhmbGF3ZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODU3MzcsImV4cCI6MjA2ODk2MTczN30.aAFZq_kyoOs_yepz-VTWOtWY6geU9S1I3YHDxgCoSPw',
               'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0a294cHZqZGp6bXhmbGF3ZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODU3MzcsImV4cCI6MjA2ODk2MTczN30.aAFZq_kyoOs_yepz-VTWOtWY6geU9S1I3YHDxgCoSPw'
             }
           })
           
           if (!response.ok) throw new Error(`API error: ${response.status}`)
           
           const data = await response.json()
           allVerses = allVerses.concat(data)
         }
         
         if (allVerses.length === 0) {
           tab.error = `No verses found for ${tab.currentBook} ${tab.currentChapter}`
           tab.allVerses = []
         } else {
           tab.allVerses = allVerses
           tab.title = `${tab.currentBook} ${tab.currentChapter}`
           
           this.initializeLoadedChapters()
           
           this.$nextTick(() => {
             this.smartScrollTo(tab.searchInput)
             setTimeout(() => {
               this.setupVerseTracking()
             }, 200)
           })
         }
         
       } catch (error) {
         tab.error = 'Failed to load verses'
         console.error('Fetch error:', error)
       } finally {
         tab.loading = false
       }
     },
     
     smartScrollTo(searchInput) {
       try {
         const input = searchInput.trim()
         console.log('smartScrollTo called with:', input)
         
         const parts = input.split(' ')
         
         let bookPart = ''
         let chapterVersePart = ''
         
         if (!isNaN(parseInt(parts[0])) && parts.length >= 2) {
           bookPart = parts[0] + ' ' + parts[1]
           if (parts.length > 2) {
             chapterVersePart = parts.slice(2).join(' ')
           }
         } else if (parts.length >= 1) {
           bookPart = parts[0]
           if (parts.length > 1) {
             chapterVersePart = parts.slice(1).join(' ')
           }
         }
         
         const normalizedBook = this.normalizeBookName(bookPart)
         if (!normalizedBook) {
           console.log('Book not found:', bookPart)
           return
         }
         
         if (!chapterVersePart) {
           console.log('Scrolling to book:', normalizedBook)
           this.scrollToTarget(`[data-book-heading="${normalizedBook}"]`, 'start')
           return
         }
         
         let chapter = null
         let verse = null
         
         if (chapterVersePart.includes(':')) {
           const [chapterStr, verseStr] = chapterVersePart.split(':')
           chapter = parseInt(chapterStr)
           verse = parseInt(verseStr)
           
           if (!isNaN(chapter) && !isNaN(verse)) {
             console.log('Scrolling to verse:', normalizedBook, chapter, verse)
             
             const verseSelector = `[data-chapter="${chapter}"][data-verse="${verse}"]`
             if (this.scrollToTarget(verseSelector, 'start')) {
               return
             }
             
             console.log('Verse not found, scrolling to chapter:', chapter)
             const chapterSelector = `[data-chapter-heading="${chapter}"]`
             if (this.scrollToTarget(chapterSelector, 'start')) {
               return
             }
             
             const firstVerseSelector = `[data-chapter="${chapter}"][data-verse="1"]`
             this.scrollToTarget(firstVerseSelector, 'start')
             return
           }
         } else {
           chapter = parseInt(chapterVersePart)
           
           if (!isNaN(chapter)) {
             console.log('Scrolling to chapter:', normalizedBook, chapter)
             const chapterSelector = `[data-chapter-heading="${chapter}"]`
             if (this.scrollToTarget(chapterSelector, 'start')) {
               return
             }
             
             const firstVerseSelector = `[data-chapter="${chapter}"][data-verse="1"]`
             this.scrollToTarget(firstVerseSelector, 'start')
             return
           }
         }
         
         console.log('No scroll target found for:', input)
         
       } catch (error) {
         console.warn('smartScrollTo error:', error)
       }
     },
     
     scrollToTarget(selector, block = 'start') {
       try {
         const element = document.querySelector(selector)
         if (element) {
           console.log('Scrolling to element:', selector)
           
           element.scrollIntoView({ 
             behavior: 'auto',
             block: block,
             inline: 'nearest'
           })
           
           return true
         }
         
         console.log('Element not found:', selector)
         return false
         
       } catch (error) {
         console.error('scrollToTarget error:', error)
         return false
       }
     },
     
     async bibleSearch() {
       const tab = this.activeTab
       if (!tab) return
       
       tab.error = null
       
       const input = tab.searchInput.trim()
       const parts = input.split(' ')
       
       if (parts.length >= 2) {
         let bookPart = ''
         let chapterPart = ''
         let versePart = null
         
         if (!isNaN(parseInt(parts[0]))) {
           if (parts.length >= 3) {
             bookPart = parts[0] + ' ' + parts[1]
             const chapterVerse = parts[2]
             
             if (chapterVerse.includes(':')) {
               const [chapterStr, verseStr] = chapterVerse.split(':')
               chapterPart = chapterStr
               versePart = verseStr
             } else {
               chapterPart = chapterVerse
             }
           } else if (parts.length === 2) {
             bookPart = parts[0] + ' ' + parts[1]
             chapterPart = null
           }
         } else {
           bookPart = parts[0]
           const chapterVerse = parts[1]
           
           if (chapterVerse.includes(':')) {
             const [chapterStr, verseStr] = chapterVerse.split(':')
             chapterPart = chapterStr
             versePart = verseStr
           } else {
             chapterPart = chapterVerse
           }
         }
         
         const normalizedBook = this.normalizeBookName(bookPart)
         
         if (normalizedBook) {
           if (chapterPart) {
             const chapter = parseInt(chapterPart)
             if (!isNaN(chapter) && chapter > 0) {
               tab.currentBook = normalizedBook
               tab.currentChapter = chapter
               tab.title = `${normalizedBook} ${chapter}`
               
               await this.fetchVerses(tab.id)
             }
           } else {
             tab.currentBook = normalizedBook
             tab.currentChapter = 1
             tab.title = `${normalizedBook} 1`
             
             await this.fetchVerses(tab.id)
           }
         } else {
           tab.error = `Book "${bookPart}" not found. Try abbreviations like "1kgs" or full names`
         }
       } else if (parts.length === 1) {
         const bookPart = parts[0]
         const normalizedBook = this.normalizeBookName(bookPart)
         
         if (normalizedBook) {
           tab.currentBook = normalizedBook
           tab.currentChapter = 1
           tab.title = `${normalizedBook} 1`
           
           await this.fetchVerses(tab.id)
         } else {
           tab.error = `Book "${bookPart}" not found. Try abbreviations like "rom", "1kgs", etc.`
         }
       } else {
         tab.error = 'Please enter a book name (e.g., "Romans") or reference (e.g., "Romans 2:12")'
       }
     },
     
     normalizeBookName(input) {
       if (!input) return null
       
       const normalized = input.toLowerCase().trim()
       return this.bookAbbreviations.get(normalized) || null
     },
     
     handleSearchKeydown(event) {
       if (event.key === 'Enter') {
         this.bibleSearch()
       }
     },
     
     createNewTab() {
       const newTab = {
         id: `tab-${this.nextTabId++}`,
         title: 'Genesis 1',
         currentBook: 'Genesis',
         currentChapter: 1,
         allVerses: [],
         searchInput: 'Genesis 1',
         loading: false,
         error: null
       }
       this.tabs.push(newTab)
       this.activeTabId = newTab.id
       this.fetchVerses(newTab.id)
     },
     
     switchToTab(tabId) {
       this.activeTabId = tabId
       this.$nextTick(() => {
         this.setupVerseTracking()
       })
     },
     
     closeTab(tabId) {
       if (this.tabs.length === 1) return
       const index = this.tabs.findIndex(tab => tab.id === tabId)
       this.tabs.splice(index, 1)
       if (this.activeTabId === tabId) {
         this.activeTabId = this.tabs[Math.max(0, index - 1)].id
         this.$nextTick(() => {
           this.setupVerseTracking()
         })
       }
     },
     
     previousChapter() {
       const tab = this.activeTab
       if (tab.currentChapter > 1) {
         tab.currentChapter--
         tab.searchInput = `${tab.currentBook} ${tab.currentChapter}`
         this.fetchVerses(tab.id)
       }
     },
     
     nextChapter() {
       const tab = this.activeTab
       tab.currentChapter++
       tab.searchInput = `${tab.currentBook} ${tab.currentChapter}`
       this.fetchVerses(tab.id)
     },
     
     scrollToChapter(chapterNumber) {
       const targetElement = document.querySelector(`[data-chapter-heading="${chapterNumber}"]`)
       if (targetElement) {
         targetElement.scrollIntoView({ 
           block: 'start' 
         })
       } else {
         const fallbackElement = document.querySelector(`[data-chapter="${chapterNumber}"][data-verse="1"]`)
         if (fallbackElement) {
           fallbackElement.scrollIntoView({ 
             block: 'start' 
           })
         }
       }
     }
   },
   
   async mounted() {
     console.log('Loading Bible reference data from database...')
     
     await Promise.all([
       this.loadBibleBooks(),
       this.loadBookAbbreviations()
     ])
     
     console.log('Database loading complete. Starting Bible reader...')
     
     this.fetchVerses(this.activeTabId)
   },
   
   beforeUnmount() {
     if (this.verseObserver) {
       this.verseObserver.disconnect()
     }
   }
 }).mount('body')
}, 1000)
