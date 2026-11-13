import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  FileVideo,
  MousePointer2,
  Pause,
  Play,
  Scissors,
  Upload,
  Waves,
} from "lucide-react";
import { Caption } from "../captions/components/Caption";
import {
  templates,
  templateStyle,
  type CaptionTemplate,
} from "../captions/model";
import { Brand } from "../../components/Brand";

export const sampleWords = ["Make", "every", "word", "count."].map(
  (text, i) => ({ id: String(i), text, start: i * 0.8, end: (i + 1) * 0.8 }),
);

function MiniTimeline({
  index,
  select,
}: {
  index: number;
  select?: (index: number) => void;
}) {
  return (
    <div className="mini-timeline" data-ui>
      <div className="mini-ruler">
        <span>00:00</span>
        <span>00:01</span>
        <span>00:02</span>
        <span>00:03</span>
      </div>
      <div className="mini-words">
        {sampleWords.map((w, i) => (
          <button
            key={w.id}
            className={index === i ? "is-active" : ""}
            onClick={() => select?.(i)}
            aria-label={`Preview ${w.text}`}
          >
            {w.text}
          </button>
        ))}
      </div>
      <div className="wave-track" aria-hidden="true">
        {Array.from({ length: 80 }, (_, i) => (
          <i key={i} style={{ height: `${20 + ((i * 37 + 13) % 80)}%` }} />
        ))}
      </div>
      <div
        className="mini-playhead"
        style={{ left: `${12.5 + index * 25}%` }}
      />
    </div>
  );
}

function ExampleFrame({
  time,
  template,
  clean = false,
  small = false,
}: {
  time: number;
  template: CaptionTemplate;
  clean?: boolean;
  small?: boolean;
}) {
  return (
    <div data-ui className={`example-frame ${small ? "small-frame" : ""}`}>
      <img
        src="/speaker.svg"
        alt="Original illustration of a creator speaking into a microphone"
      />
      {!clean && (
        <Caption
          words={sampleWords}
          time={time}
          style={{
            ...templateStyle(template),
            fontSize:
              template === "minimal-box"
                ? 92
                : template === "karaoke"
                  ? 85
                  : 140,
          }}
          previewHeight={small ? 180 : 360}
        />
      )}
    </div>
  );
}

export function Landing({
  chooseVideo,
  savedName,
  resume,
  forget,
}: {
  chooseVideo: () => void;
  savedName?: string;
  resume: () => void;
  forget: () => void;
}) {
  const [index, setIndex] = useState(2),
    [playing, setPlaying] = useState(false);
  const [template, setTemplate] = useState<CaptionTemplate>("classic-pop");
  const privacy = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!playing || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % 4), 800);
    return () => clearInterval(timer);
  }, [playing]);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add("arrived");
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.1 },
    );
    const elements = document.querySelectorAll(
      ".hero-heading, .hero-intro, .hero-example, .section-heading > *, .workflow-strip article, .before-after > div, .template-card, .spotlight-copy, .spotlight-demo, .final-cta > *",
    );
    elements.forEach((element, index) => {
      (element as HTMLElement).style.setProperty(
        "--arrival-delay",
        `${(index % 3) * 65}ms`,
      );
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);
  const time = index * 0.8 + 0.1;
  return (
    <div className="landing">
      <header className="landing-header">
        <a href="#" aria-label="Subslime home">
          <Brand />
        </a>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#templates">Templates</a>
          <button className="button small" onClick={chooseVideo}>
            Open editor <ArrowUpRight size={15} />
          </button>
        </nav>
      </header>
      <main>
        <section className="hero page-pad" aria-labelledby="hero-title">
          <div className="hero-heading">
            <h1 id="hero-title">
              Make every
              <br />
              <span className="headline-word">
                word
                <svg viewBox="0 0 100 100" aria-hidden="true">
                  <path
                    d="m14 7 16 54 9-18 22-4Z"
                    fill="#111"
                    stroke="white"
                    strokeWidth="3"
                  />
                </svg>
              </span>{" "}
              count.
            </h1>
            <p className="hero-side-note">
              Good stories deserve
              <br />
              to be seen. And read.
            </p>
          </div>
          <div className="hero-workspace">
            <div className="hero-intro">
              <p className="lead">
                Upload a video. Get perfectly editable captions. Export in your
                style.
              </p>
              {savedName && (
                <div className="saved-project">
                  <span>Current project</span>
                  <strong title={savedName}>{savedName}</strong>
                  <button className="button small" onClick={resume}>
                    Resume editing
                  </button>
                  <button className="text-link" onClick={forget}>
                    Forget saved project
                  </button>
                </div>
              )}
              <button className="upload-zone" onClick={chooseVideo}>
                <span className="upload-symbol">
                  <Upload size={25} strokeWidth={1.5} />
                </span>
                <strong>
                  Upload a video <ArrowUpRight size={20} />
                </strong>
                <span>or drop your file anywhere</span>
                <span className="upload-formats">
                  MP4, WebM, MOV · Up to 200 MB / 3 min
                </span>
              </button>
              <div className="hero-promises">
                <span>
                  <Check size={14} /> No account
                </span>
                <span>
                  <Check size={14} /> No watermark
                </span>
                <span>
                  <Check size={14} /> Free to use
                </span>
              </div>
              <a href="#how-it-works" className="text-link">
                See how it works <ArrowDown size={16} />
              </a>
            </div>
            <div className="hero-example" data-ui>
              <div className="example-topline">
                <span>
                  <span className="record-dot" /> The everyday podcast
                </span>
                <span>Illustrative preview</span>
              </div>
              <ExampleFrame time={time} template={template} />
              <div className="example-playbar">
                <button
                  className="icon-button"
                  onClick={() => setPlaying(!playing)}
                  aria-label={playing ? "Pause example" : "Play example"}
                >
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <span>
                  00:0{index} <span className="muted">/ 00:03</span>
                </span>
                <span className="playbar-note">Every word has its moment.</span>
                <Waves size={19} />
              </div>
              <MiniTimeline
                index={index}
                select={(i) => {
                  setIndex(i);
                  setPlaying(false);
                }}
              />
            </div>
          </div>
          <div className="hero-bottom">
            <span>Your video stays on your device.</span>
            <span>
              Less friction. More expression. <ArrowDown size={15} />
            </span>
          </div>
        </section>
        <section id="how-it-works" className="workflow page-pad">
          <div className="section-heading">
            <h2>
              From spoken
              <br />
              to seen.
            </h2>
            <p>
              Three small steps.
              <br />A whole new way to tell your story.
            </p>
          </div>
          <div className="workflow-strip">
            <article>
              <div className="workflow-art upload-art">
                <FileVideo size={58} strokeWidth={1} />
                <ArrowRight size={28} />
                <div className="dashed-upload">
                  <Upload size={24} />
                  <span>Your video</span>
                </div>
              </div>
              <h3>Drop it in.</h3>
              <p>
                Pick a short video. We’ll turn your speech into individual,
                editable words.
              </p>
            </article>
            <div className="workflow-connector" aria-hidden="true">
              <ArrowRight />
            </div>
            <article>
              <div className="workflow-art edit-art">
                <div className="art-word">every</div>
                <div className="art-word selected-art">
                  word
                  <span className="trim-left" />
                  <span className="trim-right" />
                  <MousePointer2 size={29} />
                </div>
              </div>
              <h3>Make it yours.</h3>
              <p>
                Fix a word, find the right timing, and choose a caption style
                that feels like you.
              </p>
            </article>
            <div className="workflow-connector" aria-hidden="true">
              <ArrowRight />
            </div>
            <article>
              <div className="workflow-art export-art">
                <div className="export-mini">
                  <img src="/speaker.svg" alt="" />
                  <span>count.</span>
                </div>
                <ArrowRight size={26} />
                <Download size={43} strokeWidth={1.2} />
              </div>
              <h3>Send it out.</h3>
              <p>
                Download a captioned MP4 or grab an SRT or VTT. No watermark,
                ever.
              </p>
            </article>
          </div>
        </section>
        <section className="showcase page-pad" aria-labelledby="showcase-title">
          <div className="section-heading">
            <h2 id="showcase-title">
              Same story.
              <br />
              More impact.
            </h2>
            <p>
              Give your words a place on the screen.
              <br />
              Even when the sound is off.
            </p>
          </div>
          <div className="before-after" data-ui>
            <div>
              <div className="frame-label">
                <span>Without captions</span>
                <span>Before</span>
              </div>
              <ExampleFrame time={time} template={template} clean />
            </div>
            <div>
              <div className="frame-label">
                <span>With captions</span>
                <span>After</span>
              </div>
              <ExampleFrame time={time} template={template} />
            </div>
          </div>
          <div className="showcase-controls">
            <span>Example: “Make every word count.”</span>
            <button className="text-link" onClick={() => setPlaying(!playing)}>
              {playing ? <Pause size={17} /> : <Play size={17} />}
              {playing ? "Pause the example" : "Play the example"}
            </button>
          </div>
        </section>
        <section className="templates-section page-pad" id="templates">
          <div className="section-heading">
            <h2>
              A style for
              <br />
              every voice.
            </h2>
            <p>
              Same words. Four different feelings.
              <br />
              Pick a template to see it in action.
            </p>
          </div>
          <div className="template-gallery">
            {templates.map((t, i) => (
              <button
                key={t.id}
                aria-pressed={template === t.id}
                className={`template-card ${template === t.id ? "selected-template" : ""}`}
                onClick={() => {
                  setTemplate(t.id);
                  setIndex(i);
                }}
              >
                <ExampleFrame time={i * 0.8 + 0.1} template={t.id} small />
                <div className="template-card-title">
                  <h3>{t.name}</h3>
                  {template === t.id ? (
                    <Check size={20} />
                  ) : (
                    <ArrowUpRight size={20} />
                  )}
                </div>
                <p>{t.description}</p>
              </button>
            ))}
          </div>
          <p className="template-footnote">
            Template previews are illustrative. Your words are the main event.
          </p>
        </section>
        <section className="timeline-spotlight page-pad">
          <div className="spotlight-copy">
            <h2>
              Every word.
              <br />
              Right on time.
            </h2>
            <p>
              Every word gets its own space on the timeline. Edit the text. Move
              it a beat. Get the timing just right.
            </p>
          </div>
          <div className="spotlight-demo" data-ui>
            <div className="spotlight-toolbar">
              <span>
                <Scissors size={16} /> Word by word
              </span>
              <span>↶ Undo</span>
            </div>
            <div className="spotlight-ruler">
              <span>00:00</span>
              <span>00:01</span>
              <span>00:02</span>
              <span>00:03</span>
            </div>
            <div className="spotlight-clips">
              {sampleWords.map((w, i) => (
                <button
                  key={w.id}
                  className={i === index ? "selected-spotlight" : ""}
                  onClick={() => setIndex(i)}
                >
                  {w.text}
                </button>
              ))}
            </div>
            <div className="spotlight-annotations">
              <span>↖ Edit text</span>
              <span>↔ Move word</span>
              <span>↔ Adjust duration</span>
            </div>
            <div className="spotlight-wave">
              <Waves size={32} />
              <span>Original audio</span>
              <div className="wave-track">
                {Array.from({ length: 52 }, (_, i) => (
                  <i key={i} style={{ height: `${15 + ((i * 47) % 85)}%` }} />
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className="final-cta page-pad">
          <h2>
            Your video. Your words.
            <br />
            Your timing.
          </h2>
          <div>
            <button className="button large" onClick={chooseVideo}>
              Start captioning for free <ArrowUpRight size={22} />
            </button>
            <p>
              No account. No watermark.
              <br />
              Processing performance depends on your device.
            </p>
          </div>
        </section>
      </main>
      <footer className="landing-footer page-pad">
        <Brand />
        <span>A little more meaning in every frame.</span>
        <button
          className="text-link"
          onClick={() => privacy.current?.showModal()}
        >
          Privacy & compatibility
        </button>
      </footer>
      <dialog
        className="info-dialog"
        ref={privacy}
        aria-labelledby="privacy-title"
      >
        <h2 id="privacy-title">Your video stays yours.</h2>
        <p>
          Videos, audio, captions and exports are processed on your device.
          There are no accounts, analytics or video uploads. The current video,
          captions, style and playback position autosave in this browser's local
          storage. Use “Forget saved project” on the home screen to remove them.
          Clearing site data, private browsing or storage eviction can remove
          the saved project, so keep downloaded exports as backups.
        </p>
        <p>
          First use downloads the English Whisper model from Hugging Face. That
          service receives ordinary download requests and your network address.
          Model files may remain in your browser cache.
        </p>
        <p>
          Start with desktop Chrome or Edge and a short H.264 MP4. This initial
          version accepts up to 200 MB, 3 minutes and 1080p, where codecs
          permit. Speed and memory use depend on your device. Check generated
          words and timing before exporting.
        </p>
        <form method="dialog">
          <button className="button small">Close</button>
        </form>
      </dialog>
    </div>
  );
}
