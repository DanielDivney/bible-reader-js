// Composables
function useTabManager() {
  const tabs = Vue.ref([
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
  ])
  
  const activeTabId = Vue.ref('tab-1')
  const nextTabId = Vue.ref(2)
  const hoveredTabId = Vue.ref(null)
  
  const activeTab = Vue.computed(() => {
    return tabs.value.find(tab => tab.id === activeTabId.value)
  })
  
  const createNewTab = () => {
    const newTab = {
      id: `tab-${nextTabId.value++}`,
      title: 'Genesis 1',
      currentBook: 'Genesis',
      currentChapter: 1,
      allVerses: [],
      searchInput: 'Genesis 1',
      loading: false,
      error: null
    }
    tabs.value.push(newTab)
    activeTabId.value = newTab.id
    return newTab
  }
  
  const switchToTab = (tabId) => {
    activeTabId.value = tabId
  }
  
  const closeTab = (tabId) => {
    if (tabs.value.length === 1) return
    const index = tabs.value.findIndex(tab => tab.id === tabId)
    tabs.value.splice(index, 1)
    if (activeTabId.value === tabId) {
      activeTabId.value = tabs.value[Math.max(0, index - 1)].id
    }
  }
  
  return {
    tabs,
    activeTabId,
    nextTabId,
    hoveredTabId,
    activeTab,
    createNewTab,
    switchToTab,
    closeTab
  }
}

function useVerseTracking() {
  const verseObserver = Vue.ref(null)
  const currentPosition = Vue.ref({
    book: 'Romans',
    chapter: 1,
    verse: null
  })
  const loadedChapters = Vue.ref(new Set())
  const isLoadingAdditional = Vue.ref(false)
  
  const setupVerseTracking = (activeTab, updateSearchInputFromPosition, checkForAdjacentChapterLoading) => {
    if (verseObserver.value) {
      verseObserver.value.disconnect()
    }
    
    verseObserver.value = new IntersectionObserver((entries) => {
      const visibleVerseNumbers = entries
        .filter(entry => entry.isIntersecting)
        .map(entry => {
          const verseElement = entry.target.closest('[data-chapter][data-verse]')
          if (!verseElement) return null
          
          const book = getBookFromVerseElement(verseElement, activeTab)
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
        updateCurrentPosition(topVerse, updateSearchInputFromPosition, checkForAdjacentChapterLoading)
      }
    }, {
      root: null,
      rootMargin: '0px 0px -80% 0px',
      threshold: 0.1
    })
    
    Vue.nextTick(() => {
      document.querySelectorAll('[data-chapter][data-verse] .verse-number, [data-chapter][data-verse]').forEach(verseEl => {
        verseObserver.value.observe(verseEl)
      })
    })
  }
  
  const getBookFromVerseElement = (verseElement, activeTab) => {
    const chapter = parseInt(verseElement.dataset.chapter)
    const verse = parseInt(verseElement.dataset.verse)
    
    if (activeTab && activeTab.allVerses) {
      const verseData = activeTab.allVerses.find(v => v.chapter === chapter && v.verse === verse)
      return verseData ? verseData.book : currentPosition.value.book
    }
    
    return currentPosition.value.book
  }
  
  const updateCurrentPosition = (verseData, updateSearchInputFromPosition, checkForAdjacentChapterLoading) => {
    const { book, chapter, verse } = verseData
    
    currentPosition.value = { book, chapter, verse }
    updateSearchInputFromPosition()
    checkForAdjacentChapterLoading(chapter)
  }
  
  const initializeLoadedChapters = (activeTab) => {
    if (activeTab && activeTab.allVerses) {
      loadedChapters.value.clear()
      const chapters = [...new Set(activeTab.allVerses.map(v => `${v.book}-${v.chapter}`))]
      chapters.forEach(key => loadedChapters.value.add(key))
    }
  }
  
  const cleanup = () => {
    if (verseObserver.value) {
      verseObserver.value.disconnect()
    }
  }
  
  return {
    verseObserver,
    currentPosition,
    loadedChapters,
    isLoadingAdditional,
    setupVerseTracking,
    getBookFromVerseElement,
    updateCurrentPosition,
    initializeLoadedChapters,
    cleanup
  }
}

function useBibleDatabase() {
  const bibleBooks = Vue.ref([])
  const bookAbbreviations = Vue.ref(new Map())
  const booksLoading = Vue.ref(false)
  const abbreviationsLoading = Vue.ref(false)
  
  const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0a294cHZqZGp6bXhmbGF3ZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODU3MzcsImV4cCI6MjA2ODk2MTczN30.aAFZq_kyoOs_yepz-VTWOtWY6geU9S1I3YHDxgCoSPw'
  const BASE_URL = 'https://htkoxpvjdjzmxflaweet.supabase.co/rest/v1'
  
  const headers = {
    'apikey': API_KEY,
    'Authorization': `Bearer ${API_KEY}`
  }
  
  const loadBibleBooks = async () => {
    if (booksLoading.value) return
    booksLoading.value = true
    
    try {
      const response = await fetch(`${BASE_URL}/bible_books?order=book_order`, { headers })
      
      if (!response.ok) throw new Error(`Failed to load Bible books: ${response.status}`)
      
      const data = await response.json()
      bibleBooks.value = data.map(book => ({
        name: book.book_name,
        order: book.book_order,
        chapters: book.total_chapters,
        testament: book.testament
      }))
      
      console.log(`Loaded ${bibleBooks.value.length} Bible books from database`)
      
    } catch (error) {
      console.error('Error loading Bible books:', error)
    } finally {
      booksLoading.value = false
    }
  }
  
  const loadBookAbbreviations = async () => {
    if (abbreviationsLoading.value) return
    abbreviationsLoading.value = true
    
    try {
      const response = await fetch(`${BASE_URL}/book_abbreviations?select=book_name,abbreviation`, { headers })
      
      if (!response.ok) throw new Error(`Failed to load book abbreviations: ${response.status}`)
      
      const data = await response.json()
      
      bookAbbreviations.value.clear()
      data.forEach(item => {
        bookAbbreviations.value.set(item.abbreviation.toLowerCase(), item.book_name)
      })
      
      console.log(`Loaded ${data.length} book abbreviations from database`)
      
    } catch (error) {
      console.error('Error loading book abbreviations:', error)
    } finally {
      abbreviationsLoading.value = false
    }
  }
  
  const loadSingleChapter = async (book, chapter) => {
    try {
      const response = await fetch(`${BASE_URL}/bible_verses?book=eq.${book}&chapter=eq.${chapter}&translation=eq.ASV&order=verse`, { headers })
      
      if (response.ok) {
        const newVerses = await response.json()
        console.log(`Successfully loaded: ${book} ${chapter} (${newVerses.length} verses)`)
        return newVerses
      }
      return []
    } catch (error) {
      console.error(`Error loading chapter ${book} ${chapter}:`, error)
      return []
    }
  }
  
  const fetchVerses = async (queries) => {
    let allVerses = []
    
    for (const query of queries) {
      const chapterQuery = query.chapters.map(c => `chapter.eq.${c}`).join(',')
      
      const response = await fetch(`${BASE_URL}/bible_verses?book=eq.${query.book}&or=(${chapterQuery})&translation=eq.ASV&order=chapter,verse`, { headers })
      
      if (!response.ok) throw new Error(`API error: ${response.status}`)
      
      const data = await response.json()
      allVerses = allVerses.concat(data)
    }
    
    return allVerses
  }
  
  const getBookInfo = (bookName) => {
    return bibleBooks.value.find(book => book.name === bookName)
  }
  
  const getPreviousBook = (currentBook) => {
    const currentBookInfo = getBookInfo(currentBook)
    if (!currentBookInfo || currentBookInfo.order === 1) return null
    
    return bibleBooks.value.find(book => book.order === currentBookInfo.order - 1)
  }
  
  const getNextBook = (currentBook) => {
    const currentBookInfo = getBookInfo(currentBook)
    if (!currentBookInfo || currentBookInfo.order === 66) return null
    
    return bibleBooks.value.find(book => book.order === currentBookInfo.order + 1)
  }
  
  const normalizeBookName = (input) => {
    if (!input) return null
    
    const normalized = input.toLowerCase().trim()
    return bookAbbreviations.value.get(normalized) || null
  }
  
  return {
    bibleBooks,
    bookAbbreviations,
    booksLoading,
    abbreviationsLoading,
    loadBibleBooks,
    loadBookAbbreviations,
    loadSingleChapter,
    fetchVerses,
    getBookInfo,
    getPreviousBook,
    getNextBook,
    normalizeBookName
  }
}

function useScrollManager(database) {
  const smartScrollTo = (searchInput) => {
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
      
      const normalizedBook = database.normalizeBookName(bookPart)
      if (!normalizedBook) {
        console.log('Book not found:', bookPart)
        return
      }
      
      if (!chapterVersePart) {
        console.log('Scrolling to book:', normalizedBook)
        scrollToTarget(`[data-book-heading="${normalizedBook}"]`, 'start')
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
          if (scrollToTarget(verseSelector, 'start')) {
            return
          }
          
          console.log('Verse not found, scrolling to chapter:', chapter)
          const chapterSelector = `[data-chapter-heading="${chapter}"]`
          if (scrollToTarget(chapterSelector, 'start')) {
            return
          }
          
          const firstVerseSelector = `[data-chapter="${chapter}"][data-verse="1"]`
          scrollToTarget(firstVerseSelector, 'start')
          return
        }
      } else {
        chapter = parseInt(chapterVersePart)
        
        if (!isNaN(chapter)) {
          console.log('Scrolling to chapter:', normalizedBook, chapter)
          const chapterSelector = `[data-chapter-heading="${chapter}"]`
          if (scrollToTarget(chapterSelector, 'start')) {
            return
          }
          
          const firstVerseSelector = `[data-chapter="${chapter}"][data-verse="1"]`
          scrollToTarget(firstVerseSelector, 'start')
          return
        }
      }
      
      console.log('No scroll target found for:', input)
      
    } catch (error) {
      console.warn('smartScrollTo error:', error)
    }
  }
  
  const scrollToTarget = (selector, block = 'start') => {
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
  }
  
  const scrollToChapter = (chapterNumber) => {
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
  
  return {
    smartScrollTo,
    scrollToTarget,
    scrollToChapter
  }
}

setTimeout(function() {
 Vue.createApp({
   setup() {
     // Initialize all composables
     const tabManager = useTabManager()
     const verseTracking = useVerseTracking()
     const database = useBibleDatabase()
     const scrollManager = useScrollManager(database)
     
     // Bible search composable logic
     const bibleSearch = async () => {
       const tab = tabManager.activeTab.value
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
         
         const normalizedBook = database.normalizeBookName(bookPart)
         
         if (normalizedBook) {
           if (chapterPart) {
             const chapter = parseInt(chapterPart)
             if (!isNaN(chapter) && chapter > 0) {
               tab.currentBook = normalizedBook
               tab.currentChapter = chapter
               tab.title = `${normalizedBook} ${chapter}`
               
               await fetchVerses(tab.id)
             }
           } else {
             tab.currentBook = normalizedBook
             tab.currentChapter = 1
             tab.title = `${normalizedBook} 1`
             
             await fetchVerses(tab.id)
           }
         } else {
           tab.error = `Book "${bookPart}" not found. Try abbreviations like "1kgs" or full names`
         }
       } else if (parts.length === 1) {
         const bookPart = parts[0]
         const normalizedBook = database.normalizeBookName(bookPart)
         
         if (normalizedBook) {
           tab.currentBook = normalizedBook
           tab.currentChapter = 1
           tab.title = `${normalizedBook} 1`
           
           await fetchVerses(tab.id)
         } else {
           tab.error = `Book "${bookPart}" not found. Try abbreviations like "rom", "1kgs", etc.`
         }
       } else {
         tab.error = 'Please enter a book name (e.g., "Romans") or reference (e.g., "Romans 2:12")'
       }
     }
     
     const buildCrossBookQuery = (currentBook, currentChapter) => {
       const currentBookInfo = database.getBookInfo(currentBook)
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
         const prevBook = database.getPreviousBook(currentBook)
         if (prevBook) {
           queries.unshift({
             book: prevBook.name,
             chapters: [prevBook.chapters]
           })
         }
       }
       
       if (currentChapter === currentBookInfo.chapters) {
         const nextBook = database.getNextBook(currentBook)
         if (nextBook) {
           queries.push({
             book: nextBook.name,
             chapters: [1]
           })
         }
       }
       
       return queries
     }
     
     const fetchVerses = async (tabId) => {
       const tab = tabManager.tabs.value.find(t => t.id === tabId)
       if (!tab) return
       
       tab.loading = true
       tab.error = null
       
       try {
         const queries = buildCrossBookQuery(tab.currentBook, tab.currentChapter)
         if (!queries) {
           tab.error = 'Invalid book name'
           return
         }
         
         const allVerses = await database.fetchVerses(queries)
         
         if (allVerses.length === 0) {
           tab.error = `No verses found for ${tab.currentBook} ${tab.currentChapter}`
           tab.allVerses = []
         } else {
           tab.allVerses = allVerses
           tab.title = `${tab.currentBook} ${tab.currentChapter}`
           
           verseTracking.initializeLoadedChapters(tab)
           
           Vue.nextTick(() => {
             scrollManager.smartScrollTo(tab.searchInput)
             setTimeout(() => {
               verseTracking.setupVerseTracking(
                 tab, 
                 updateSearchInputFromPosition, 
                 checkForAdjacentChapterLoading
               )
             }, 200)
           })
         }
         
       } catch (error) {
         tab.error = 'Failed to load verses'
         console.error('Fetch error:', error)
       } finally {
         tab.loading = false
       }
     }
     
     const updateSearchInputFromPosition = () => {
       const tab = tabManager.activeTab.value
       if (!tab) return
       
       const { book, chapter, verse } = verseTracking.currentPosition.value
       
       tab.searchInput = `${book} ${chapter}:${verse}`
       tab.title = `${book} ${chapter}`
     }
     
     const checkForAdjacentChapterLoading = (currentChapter) => {
       if (verseTracking.isLoadingAdditional.value) return
       
       const tab = tabManager.activeTab.value
       if (!tab) return
       
       const currentBookVerses = tab.allVerses.filter(v => v.book === verseTracking.currentPosition.value.book)
       const loadedChapters = [...new Set(currentBookVerses.map(v => v.chapter))].sort((a, b) => a - b)
       
       if (loadedChapters.length === 0) return
       
       const minLoaded = Math.min(...loadedChapters)
       const maxLoaded = Math.max(...loadedChapters)
       
       if (currentChapter === maxLoaded) {
         loadAdjacentChapter('forward', verseTracking.currentPosition.value.book, maxLoaded)
       }
       
       if (currentChapter === minLoaded) {
         loadAdjacentChapter('backward', verseTracking.currentPosition.value.book, minLoaded)
       }
     }
     
     const loadAdjacentChapter = async (direction, currentBook, currentChapter) => {
       if (verseTracking.isLoadingAdditional.value) return
       
       verseTracking.isLoadingAdditional.value = true
       
       try {
         let targetBook, targetChapter
         
         if (direction === 'forward') {
           const bookInfo = database.getBookInfo(currentBook)
           if (!bookInfo) return
           
           if (currentChapter < bookInfo.chapters) {
             targetBook = currentBook
             targetChapter = currentChapter + 1
           } else {
             const nextBook = database.getNextBook(currentBook)
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
             const prevBook = database.getPreviousBook(currentBook)
             if (prevBook) {
               targetBook = prevBook.name
               targetChapter = prevBook.chapters
             }
           }
         }
         
         if (targetBook && targetChapter) {
           const chapterKey = `${targetBook}-${targetChapter}`
           
           if (verseTracking.loadedChapters.value.has(chapterKey)) {
             return
           }
           
           console.log(`Loading ${direction} chapter: ${targetBook} ${targetChapter}`)
           
           const newVerses = await database.loadSingleChapter(targetBook, targetChapter)
           if (newVerses.length > 0) {
             const tab = tabManager.activeTab.value
             tab.allVerses = [...tab.allVerses, ...newVerses]
             
             Vue.nextTick(() => {
               verseTracking.setupVerseTracking(
                 tab, 
                 updateSearchInputFromPosition, 
                 checkForAdjacentChapterLoading
               )
             })
           }
           
           verseTracking.loadedChapters.value.add(chapterKey)
         }
         
       } catch (error) {
         console.error('Error loading adjacent chapter:', error)
       } finally {
         verseTracking.isLoadingAdditional.value = false
       }
     }
     
     const handleSearchKeydown = (event) => {
       if (event.key === 'Enter') {
         bibleSearch()
       }
     }
     
     // Navigation functions
     const previousChapter = () => {
       const tab = tabManager.activeTab.value
       if (tab.currentChapter > 1) {
         tab.currentChapter--
         tab.searchInput = `${tab.currentBook} ${tab.currentChapter}`
         fetchVerses(tab.id)
       }
     }
     
     const nextChapter = () => {
       const tab = tabManager.activeTab.value
       tab.currentChapter++
       tab.searchInput = `${tab.currentBook} ${tab.currentChapter}`
       fetchVerses(tab.id)
     }
     
     // Tab management with tracking setup
     const switchToTab = (tabId) => {
       tabManager.switchToTab(tabId)
       Vue.nextTick(() => {
         verseTracking.setupVerseTracking(
           tabManager.activeTab.value,
           updateSearchInputFromPosition,
           checkForAdjacentChapterLoading
         )
       })
     }
     
     const closeTab = (tabId) => {
       tabManager.closeTab(tabId)
       if (tabManager.activeTabId.value !== tabId) return
       Vue.nextTick(() => {
         verseTracking.setupVerseTracking(
           tabManager.activeTab.value,
           updateSearchInputFromPosition,
           checkForAdjacentChapterLoading
         )
       })
     }
     
     const createNewTab = () => {
       const newTab = tabManager.createNewTab()
       fetchVerses(newTab.id)
     }
     
     // Computed properties
     const sortedVerses = Vue.computed(() => {
       const tab = tabManager.activeTab.value
       if (!tab || !tab.allVerses) return []
       
       const uniqueBooks = [...new Set(tab.allVerses.map(v => v.book))]
       
       if (uniqueBooks.length > 1) {
         return tab.allVerses
       } else {
         return tab.allVerses.sort((a, b) => {
           if (a.chapter !== b.chapter) return a.chapter - b.chapter
           return a.verse - b.verse
         })
       }
     })
     
     const groupedBooks = Vue.computed(() => {
       const verses = sortedVerses.value
       if (!verses.length) return []
       
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
       
       return Object.values(books)
         .sort((a, b) => a.firstVerseIndex - b.firstVerseIndex)
         .map(book => ({
           book: book.book,
           chapters: Object.values(book.chapters).sort((a, b) => a.chapter - b.chapter)
         }))
     })
     
     // Lifecycle hooks
     Vue.onMounted(async () => {
       console.log('Loading Bible reference data from database...')
       
       await Promise.all([
         database.loadBibleBooks(),
         database.loadBookAbbreviations()
       ])
       
       console.log('Database loading complete. Starting Bible reader...')
       
       fetchVerses(tabManager.activeTabId.value)
     })
     
     Vue.onBeforeUnmount(() => {
       verseTracking.cleanup()
     })
     
     // Return all data and methods for template
     return {
       // Tab management
       tabs: tabManager.tabs,
       activeTabId: tabManager.activeTabId,
       nextTabId: tabManager.nextTabId,
       hoveredTabId: tabManager.hoveredTabId,
       activeTab: tabManager.activeTab,
       switchToTab,
       closeTab,
       createNewTab,
       
       // Verse tracking
       currentPosition: verseTracking.currentPosition,
       
       // Database
       bibleBooks: database.bibleBooks,
       booksLoading: database.booksLoading,
       abbreviationsLoading: database.abbreviationsLoading,
       
       // Search functionality
       bibleSearch,
       handleSearchKeydown,
       
       // Navigation
       previousChapter,
       nextChapter,
       
       // Scroll management
       scrollToChapter: scrollManager.scrollToChapter,
       
       // Computed properties
       sortedVerses,
       groupedBooks
     }
   }
 }).mount('body')
}, 1000)
