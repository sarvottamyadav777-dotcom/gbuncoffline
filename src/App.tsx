import { useState, useEffect, useRef } from 'react';
import Artplayer from 'artplayer';

interface Subject {
  subject_name: string;
  uid: string;
}

interface Batch {
  category: string;
  batch_id?: string;
  batch_name: string;
  subjects: Subject[];
}

interface Author {
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
}

interface LiveClass {
  author?: Author;
  live_at?: string;
  video_url?: string;
  slides_pdf?: {
    with_annotation?: string;
    no_annotation?: string;
  };
}

interface LectureItem {
  type?: string;
  rank?: number;
  value: {
    uid?: string;
    title?: string;
    description?: string;
    relative_link?: string;
    live_class?: LiveClass;
  };
}

const PROXY_BASE = 'https://unc-worker.mikey-nt.workers.dev';
const LOGO_SRC = '/gb_study_logo.png';
const LOGO_FALLBACK = 'https://i.ibb.co/Q3g9fGSt/1791541921524.png';

const fallbackDatabase: Batch[] = [
  {
    category: 'IIT JEE Premium',
    batch_id: 'batch_jee_2026',
    batch_name: 'Evolve Batch Pro 2026',
    subjects: [
      { subject_name: 'Advanced Physics Core', uid: '603e56c5a278d211' },
      { subject_name: 'Organic & Inorganic Synthetics', uid: '512a88e1b2390c55' },
    ],
  },
  {
    category: 'UPSC Civil Services',
    batch_id: 'batch_upsc_2026',
    batch_name: 'Mission IAS Strategic Alpha',
    subjects: [
      { subject_name: 'Indian Polity & Governance Frameworks', uid: '9918b822d1034f77' },
    ],
  },
];

function parseLectureDate(dateString?: string): string {
  try {
    if (!dateString) return 'Date not specified';
    const utcTime = new Date(dateString);
    if (isNaN(utcTime.getTime())) return 'Active Segment';
    const istTime = new Date(utcTime.getTime() + 5.5 * 60 * 60 * 1000);
    return istTime.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return 'Active Segment';
  }
}

function formatDateForComparison(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function generateEmergencyMockPayload(): LectureItem[] {
  const items: LectureItem[] = [];
  for (let i = 1; i <= 10; i++) {
    items.push({
      value: {
        title: `Lecture Module 0${i} : Advanced Concepts & Problem Solving`,
        live_class: {
          author: { first_name: 'GB STUDY', last_name: 'Faculty' },
          live_at: new Date(Date.now() - i * 86400000).toISOString(),
          video_url: `https://unacademy.com/lesson/mock-router?uid=mock_asset_node_0${i}`,
          slides_pdf: { with_annotation: 'https://uamedia.uacdn.net/fallback_document.pdf' },
        },
      },
    });
  }
  return items;
}

export default function App() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Navigation State
  const [currentView, setCurrentView] = useState<
    'categories' | 'batches' | 'subjects' | 'lectures'
  >('categories');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Lectures State
  const [lectures, setLectures] = useState<LectureItem[]>([]);
  const [loadingLectures, setLoadingLectures] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('all');

  // Video Modal State
  const [activeVideo, setActiveVideo] = useState<{ url: string; title: string } | null>(null);
  const artPlayerContainerRef = useRef<HTMLDivElement>(null);
  const artPlayerInstanceRef = useRef<any>(null);

  // PDF Viewer Modal State
  const [activePdf, setActivePdf] = useState<{ url: string; title: string } | null>(null);

  // Fetch all batches on initial load
  useEffect(() => {
    async function fetchBatches() {
      setLoadingBatches(true);
      setBatchError(null);
      try {
        const response = await fetch(`${PROXY_BASE}/api/batches`);
        if (!response.ok) throw new Error('API request failed');
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setBatches(data);
        } else {
          setBatches(fallbackDatabase);
        }
      } catch (err) {
        console.warn('Proxy batches API unavailable, using embedded database failover.', err);
        setBatches(fallbackDatabase);
      } finally {
        setLoadingBatches(false);
      }
    }
    fetchBatches();
  }, []);

  // Handle Video Player lifecycle
  useEffect(() => {
    if (!activeVideo || !artPlayerContainerRef.current) return;

    if (artPlayerInstanceRef.current && typeof artPlayerInstanceRef.current.destroy === 'function') {
      artPlayerInstanceRef.current.destroy();
      artPlayerInstanceRef.current = null;
    }

    const ArtClass = (window as any).Artplayer || Artplayer;
    try {
      const art = new ArtClass({
        container: artPlayerContainerRef.current,
        url: activeVideo.url,
        title: activeVideo.title,
        volume: 0.75,
        isLive: false,
        muted: false,
        autoplay: true,
        pip: true,
        autoSize: false,
        autoMini: true,
        screenshot: true,
        setting: true,
        loop: false,
        flip: true,
        playbackRate: true,
        aspectRatio: true,
        fullscreen: true,
        fullscreenWeb: false,
        subtitleOffset: true,
        miniProgressBar: true,
        mutex: true,
        backdrop: true,
        playsInline: true,
        autoPlayback: true,
        airplay: true,
        theme: '#FFC107',
        moreVideoAttr: {
          crossOrigin: 'anonymous',
        },
      });

      artPlayerInstanceRef.current = art;
    } catch (e) {
      console.error('Failed to initialize Artplayer:', e);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeVideoModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (artPlayerInstanceRef.current && typeof artPlayerInstanceRef.current.destroy === 'function') {
        artPlayerInstanceRef.current.destroy();
        artPlayerInstanceRef.current = null;
      }
    };
  }, [activeVideo]);

  const closeVideoModal = () => {
    if (artPlayerInstanceRef.current && typeof artPlayerInstanceRef.current.destroy === 'function') {
      artPlayerInstanceRef.current.destroy();
      artPlayerInstanceRef.current = null;
    }
    setActiveVideo(null);
  };

  // Fetch Lectures for selected Subject
  const handleSelectSubject = async (subject: Subject) => {
    setSelectedSubject(subject);
    setCurrentView('lectures');
    setLoadingLectures(true);
    setSearchQuery('');
    setSelectedDate('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const idList = String(subject.uid)
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id);

    let combinedResults: LectureItem[] = [];

    for (const id of idList) {
      try {
        const endpoint = `${PROXY_BASE}/api/collection?id=${id}`;
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data && data.results && Array.isArray(data.results)) {
          combinedResults = combinedResults.concat(data.results);
        }
      } catch (err) {
        console.warn(`Payload link ${id} offline:`, err);
      }
    }

    if (combinedResults.length === 0) {
      combinedResults = generateEmergencyMockPayload();
    }

    // Deduplicate by video url
    const uniquelyMapped: LectureItem[] = [];
    const trackedUrls = new Set<string>();
    combinedResults.forEach((item) => {
      const targetUrl = item.value?.live_class?.video_url;
      if (targetUrl && !trackedUrls.has(targetUrl)) {
        trackedUrls.add(targetUrl);
        uniquelyMapped.push(item);
      } else if (!targetUrl && item.value?.title) {
        uniquelyMapped.push(item);
      }
    });

    setLectures(uniquelyMapped);
    setLoadingLectures(false);
  };

  // Unique categories
  const categories = Array.from(new Set(batches.map((b) => b.category).filter(Boolean))).sort();

  // Batches for selected category
  const filteredBatches = selectedCategory
    ? batches.filter((b) => b.category === selectedCategory)
    : [];

  // Unique dates in current lectures
  const recordedDates = Array.from(
    new Set(
      lectures
        .map((item) => {
          const raw = item.value?.live_class?.live_at;
          if (raw) {
            const dateObj = new Date(raw);
            if (!isNaN(dateObj.getTime())) {
              return formatDateForComparison(dateObj);
            }
          }
          return null;
        })
        .filter(Boolean) as string[]
    )
  ).sort((x, y) => new Date(y).getTime() - new Date(x).getTime());

  // Filtered lectures based on search query & date filter
  const filteredLectures = lectures.filter((item) => {
    const title = (item.value?.title || '').toLowerCase();
    const fName = (item.value?.live_class?.author?.first_name || '').toLowerCase();
    const lName = (item.value?.live_class?.author?.last_name || '').toLowerCase();
    const matchesSearch =
      title.includes(searchQuery.toLowerCase()) ||
      fName.includes(searchQuery.toLowerCase()) ||
      lName.includes(searchQuery.toLowerCase());

    if (selectedDate === 'all') return matchesSearch;

    const classTimestamp = item.value?.live_class?.live_at;
    const matchesDate =
      classTimestamp && formatDateForComparison(new Date(classTimestamp)) === selectedDate;
    return matchesSearch && matchesDate;
  });

  return (
    <div id="main-content" className="min-h-screen flex flex-col">
      {/* Header with GB STUDY Branding */}
      <header className="header">
        <div className="header-content">
          <img
            src={LOGO_SRC}
            alt="GB STUDY Logo"
            className="header-logo"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = LOGO_FALLBACK;
            }}
          />
          <h1>GB STUDY</h1>
        </div>
      </header>

      {/* Main Container */}
      <main className="container flex-1">
        {/* View 1: Explore Categories */}
        {currentView === 'categories' && (
          <div>
            <h2 className="section-title">Explore Categories</h2>
            {loadingBatches ? (
              <div className="loading">
                <i className="fas fa-layer-group fa-spin"></i>
                <span>Initializing GB STUDY Platform...</span>
              </div>
            ) : batchError ? (
              <p className="error-message">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                {batchError}
              </p>
            ) : (
              <div className="grid-container">
                {categories.map((category) => (
                  <div
                    key={category}
                    className="folder-card"
                    onClick={() => {
                      setSelectedCategory(category);
                      setCurrentView('batches');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <i className="fas fa-layer-group"></i>
                    <div className="folder-header">{category}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* View 2: Explore Batches */}
        {currentView === 'batches' && (
          <div>
            <div className="top-controls">
              <button
                className="back-button"
                onClick={() => {
                  setCurrentView('categories');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <i className="fas fa-arrow-left"></i> Back to Categories
              </button>
            </div>
            <h2 className="section-title">{selectedCategory || 'Explore Batches'}</h2>
            <div className="grid-container">
              {filteredBatches.map((batch, idx) => (
                <div
                  key={batch.batch_id || idx}
                  className="folder-card"
                  onClick={() => {
                    setSelectedBatch(batch);
                    setCurrentView('subjects');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <i className="fas fa-folder-open"></i>
                  <div className="folder-header">{batch.batch_name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View 3: Explore Subjects */}
        {currentView === 'subjects' && selectedBatch && (
          <div>
            <div className="top-controls">
              <button
                className="back-button"
                onClick={() => {
                  setCurrentView('batches');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <i className="fas fa-arrow-left"></i> Back to Batches
              </button>
            </div>
            <h2 className="section-title">{selectedBatch.batch_name}</h2>
            <div className="grid-container">
              {selectedBatch.subjects && selectedBatch.subjects.length > 0 ? (
                selectedBatch.subjects.map((sub, idx) => (
                  <div
                    key={sub.uid || idx}
                    className="folder-card"
                    onClick={() => handleSelectSubject(sub)}
                  >
                    <i className="fas fa-book-open"></i>
                    <div className="folder-header">{sub.subject_name}</div>
                  </div>
                ))
              ) : (
                <p className="error-message">No subjects found in this batch.</p>
              )}
            </div>
          </div>
        )}

        {/* View 4: Explore Lectures */}
        {currentView === 'lectures' && selectedSubject && (
          <div>
            <div className="top-controls">
              <button
                className="back-button"
                onClick={() => {
                  setCurrentView('subjects');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <i className="fas fa-arrow-left"></i> Back to Subjects
              </button>

              <div className="date-filter-container">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                >
                  <option value="all">All Available Dates</option>
                  {recordedDates.map((dStr) => (
                    <option key={dStr} value={dStr}>
                      {dStr.split('-').reverse().join('/')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <h2 className="section-title">{selectedSubject.subject_name}</h2>

            <div className="search-bar-container">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by lecture title or instructor..."
              />
            </div>

            {loadingLectures ? (
              <div className="loading">
                <i className="fas fa-sync fa-spin"></i>
                <span>Gathering lectures...</span>
              </div>
            ) : filteredLectures.length === 0 ? (
              <div className="error-message">
                <i
                  className="fas fa-search-minus"
                  style={{ fontSize: '2.2rem', display: 'block', marginBottom: '12px' }}
                ></i>
                No lectures found matching your search.
              </div>
            ) : (
              <div>
                {filteredLectures.map((item, idx) => {
                  const core = item.value || {};
                  const titleStr = core.title || 'Untitled Lecture';
                  const teacherStr =
                    `${core.live_class?.author?.first_name || ''} ${
                      core.live_class?.author?.last_name || ''
                    }`.trim() || 'GB STUDY Faculty';
                  const dateDisplay = parseLectureDate(core.live_class?.live_at);

                  let mediaAcceleratedLink =
                    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
                  const originalUrl = core.live_class?.video_url || '';
                  if (originalUrl.includes('uid=')) {
                    try {
                      const extractedMediaUid = originalUrl.split('uid=')[1].split('&')[0];
                      mediaAcceleratedLink = `${PROXY_BASE}/api/stream?uid=${extractedMediaUid}`;
                    } catch {}
                  }

                  const docPdf =
                    core.live_class?.slides_pdf?.with_annotation ||
                    core.live_class?.slides_pdf?.no_annotation ||
                    null;
                  const pdfProxyUrl = docPdf
                    ? `${PROXY_BASE}/api/pdf?file=${encodeURIComponent(docPdf)}`
                    : null;

                  return (
                    <div key={core.uid || idx} className="lecture-item">
                      <h3>{titleStr}</h3>

                      <div className="lecture-meta">
                        <span>
                          <i className="fas fa-user-tie"></i>
                          <strong>Instructor:</strong> {teacherStr}
                        </span>
                        <span>
                          <i className="fas fa-calendar-day"></i>
                          <strong>Date:</strong> {dateDisplay}
                        </span>
                      </div>

                      <div className="lecture-actions">
                        <button
                          className="watch-online"
                          onClick={() => {
                            setActiveVideo({
                              url: mediaAcceleratedLink,
                              title: titleStr,
                            });
                          }}
                        >
                          <i className="fas fa-play-circle"></i> Watch Online
                        </button>

                        <a
                          href={mediaAcceleratedLink}
                          download={`${titleStr.replace(/[^a-z0-9]/gi, '_')}.mp4`}
                        >
                          <i className="fas fa-download"></i> Download
                        </a>

                        {pdfProxyUrl && (
                          <button
                            type="button"
                            className="pdf-btn"
                            style={{
                              borderColor: '#ff6b6b',
                              color: '#ff6b6b',
                            }}
                            onClick={() => {
                              setActivePdf({
                                url: pdfProxyUrl,
                                title: `${titleStr} - Notes`,
                              });
                            }}
                          >
                            <i className="fas fa-file-pdf"></i> View PDF
                          </button>
                        )}

                        {pdfProxyUrl && (
                          <a
                            href={pdfProxyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              borderColor: '#ff9800',
                              color: '#ff9800',
                              fontSize: '0.85rem',
                              padding: '10px 18px',
                            }}
                            title="Open notes in new tab"
                          >
                            <i className="fas fa-arrow-up-right-from-square"></i> Open Tab
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Video Modal (ArtPlayer) */}
      {activeVideo && (
        <div
          className="modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeVideoModal();
            }
          }}
        >
          <div className="modal-content-wrapper">
            <button
              className="close-artmodal-btn"
              onClick={closeVideoModal}
              title="Close Video (Esc)"
            >
              &times;
            </button>
            <div ref={artPlayerContainerRef} className="artplayer-app"></div>
          </div>
        </div>
      )}

      {/* PDF Notes Viewer Modal */}
      {activePdf && (
        <div
          className="modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActivePdf(null);
            }
          }}
        >
          <div className="pdf-modal-container">
            <div className="pdf-modal-header">
              <h4 title={activePdf.title}>
                <i className="fas fa-file-pdf mr-2 text-red-400"></i>
                {activePdf.title}
              </h4>
              <div className="flex items-center gap-3">
                <a
                  href={activePdf.url}
                  download="notes.pdf"
                  className="text-xs px-3 py-1.5 rounded-full border border-yellow-500 text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                >
                  <i className="fas fa-download mr-1"></i> Download
                </a>
                <a
                  href={activePdf.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  <i className="fas fa-external-link-alt mr-1"></i> New Tab
                </a>
                <button
                  onClick={() => setActivePdf(null)}
                  className="text-gray-400 hover:text-white text-xl px-2 font-bold transition-colors cursor-pointer"
                  title="Close PDF"
                >
                  &times;
                </button>
              </div>
            </div>
            <div className="pdf-modal-body">
              <iframe
                src={activePdf.url}
                className="w-full h-full border-0"
                title={activePdf.title}
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-neutral-500 border-t border-[rgba(255,193,7,0.1)] mt-12">
        <p>© {new Date().getFullYear()} GB STUDY. All rights reserved.</p>
      </footer>
    </div>
  );
}
