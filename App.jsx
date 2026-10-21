
import React, { useRef, useState } from 'react';
import {
  Leaf, Sparkles, Camera, ChefHat, Salad, ShieldCheck,
  ArrowUpRight, Upload, CheckCircle2, LoaderCircle, Utensils
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

const features = [
  { id: 'vision', icon: Camera, number: '01', title: 'Food Vision', desc: 'Upload a food photo for a structured visual review.', tag: 'IMAGE ANALYSIS' },
  { id: 'cook', icon: ChefHat, number: '02', title: 'Smart Cooking', desc: 'Turn your ingredients into a recipe idea.', tag: 'RECIPE ASSISTANT' },
  { id: 'nutrition', icon: Salad, number: '03', title: 'Nutrition Planner', desc: 'Explore meal ideas for your preferences.', tag: 'PERSONALIZED IDEAS' },
  { id: 'hygiene', icon: ShieldCheck, number: '04', title: 'Hygiene Guide', desc: 'Review practical food-handling checks.', tag: 'FOOD SAFETY' }
];

export default function App() {
  const [active, setActive] = useState('vision');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [dietary, setDietary] = useState('No preference');
  const [goal, setGoal] = useState('Balanced meals');
  const inputRef = useRef(null);

  function chooseFile(f) {
    if (!f) return;

    if (!f.type.startsWith('image/')) {
      setError('Please choose a valid image file.');
      return;
    }

    if (f.size > 8 * 1024 * 1024) {
      setError('Image size must be less than 8 MB.');
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError('');
  }

  async function post(path, body, isForm = false) {
    const options = isForm
      ? { method: 'POST', body }
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        };

    let response;

    try {
      response = await fetch(`${API}${path}`, options);
    } catch {
      throw new Error(
        'Cannot connect to the backend. Check that Flask is running at http://127.0.0.1:5000.'
      );
    }

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error('The backend returned an invalid response.');
    }

    if (!response.ok) {
      const detail = data.details ? ` Details: ${data.details}` : '';
      throw new Error((data.error || 'Request failed.') + detail);
    }

    return data;
  }

  async function runAction() {
    setBusy(true);
    setError('');
    setResult(null);

    try {
      let data;

      if (active === 'vision') {
        if (!file) {
          throw new Error('Please upload a food image first.');
        }

        const formData = new FormData();
        formData.append('image', file);

        data = await post('/api/analyze-food', formData, true);
      } else if (active === 'cook') {
        if (!ingredients.trim()) {
          throw new Error('Enter your ingredients first, separated by commas.');
        }

        data = await post('/api/recipe', { ingredients, dietary });
      } else if (active === 'nutrition') {
        data = await post('/api/nutrition', { goal, dietary });
      } else {
        data = await post('/api/hygiene', {});
      }

      setResult(data);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const selected = features.find(item => item.id === active);

  function selectFeature(id) {
    setActive(id);
    setResult(null);
    setError('');
  }

  function renderList(items) {
    if (!Array.isArray(items) || items.length === 0) return null;

    return (
      <ul>
        {items.map((item, index) => (
          <li key={`${String(item)}-${index}`}>
            {typeof item === 'object' && item !== null
              ? Object.entries(item).map(([key, value]) => (
                  <span key={key}>
                    <strong>{key.replaceAll('_', ' ')}: </strong>
                    {String(value)}{' '}
                  </span>
                ))
              : String(item)}
          </li>
        ))}
      </ul>
    );
  }

  function renderResult() {
    if (!result) return null;

    const analysis = result.analysis;

    return (
      <div className="result-box">
        <div className="result-heading">
          <CheckCircle2 size={18} />
          <strong>
            {active === 'vision' ? 'Food Image Analysis' :
             active === 'cook' ? 'Your Recipe Idea' :
             active === 'nutrition' ? 'Nutrition Planner' :
             'Kitchen Hygiene Guide'}
          </strong>
        </div>

        {analysis && (
          <div>
            <h3>{analysis.food_name || 'Food analysis'}</h3>

            {analysis.category && (
              <p><strong>Category:</strong> {analysis.category}</p>
            )}

            {analysis.visible_ingredients && (
              <>
                <h4>Visible Ingredients</h4>
                {renderList(analysis.visible_ingredients)}
              </>
            )}

            {analysis.visual_observations && (
              <>
                <h4>Visual Observations</h4>
                {renderList(analysis.visual_observations)}
              </>
            )}

            {analysis.nutrition_estimate && (
              <>
                <h4>Estimated Nutrition</h4>
                {renderList(
                  Object.entries(analysis.nutrition_estimate).map(
                    ([key, value]) => ({
                      [key.replaceAll('_', ' ')]: typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value)
                    })
                  )
                )}
              </>
            )}

            {analysis.freshness_observations && (
              <p>
                <strong>Visual observations:</strong>{' '}
                {analysis.freshness_observations}
              </p>
            )}

            {analysis.confidence && (
              <p><strong>AI confidence:</strong> {analysis.confidence}</p>
            )}

            {analysis.limitations && (
              <>
                <h4>Limitations</h4>
                {renderList(analysis.limitations)}
              </>
            )}
          </div>
        )}

        {result.title && <h3>{result.title}</h3>}

        {result.ingredients && (
          <>
            <h4>Ingredients</h4>
            {renderList(result.ingredients)}
          </>
        )}

        {result.dietary_preference && (
          <p>
            <strong>Dietary preference:</strong>{' '}
            {result.dietary_preference}
          </p>
        )}

        {result.dietary_note && <p>{result.dietary_note}</p>}

        {result.goal && (
          <p><strong>Meal-planning goal:</strong> {result.goal}</p>
        )}

        {result.steps && (
          <>
            <h4>Steps</h4>
            <ol>
              {result.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </>
        )}

        {result.suggestions && (
          <>
            <h4>Suggestions</h4>
            {renderList(result.suggestions)}
          </>
        )}

        {result.checks && (
          <>
            <h4>Hygiene Checks</h4>
            {renderList(result.checks)}
          </>
        )}

        {result.note && <p className="result-note">{result.note}</p>}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-mark"><Leaf size={19} /></span>
          <span>food<span className="brand-light">verse</span>
            <small>INTELLIGENCE, REIMAGINED</small>
          </span>
        </a>

        <nav>
          <a href="#features">Platform</a>
          <a href="#workspace">AI Workspace</a>
          <a href="#about">About</a>
        </nav>

        <a className="top-cta" href="#workspace">
          Try the demo <ArrowUpRight size={16} />
        </a>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="pulse"></span>
              MULTIMODAL FOOD INTELLIGENCE AGENT
            </div>

            <h1>A smarter way<br />to think about <em>food.</em></h1>

            <p className="hero-text">
              Explore food vision, cooking guidance, nutrition ideas and
              food-safety awareness in one workspace.
            </p>

            <div className="hero-actions">
              <a className="primary-btn" href="#workspace">
                Explore the workspace <ArrowUpRight size={17} />
              </a>
              <span className="micro-note">
                <Sparkles size={14} /> AI-assisted prototype
              </span>
            </div>

            <div className="hero-stats">
              <div><strong>04</strong><span>CORE MODULES</span></div>
              <i></i>
              <div><strong>01</strong><span>UNIFIED WORKSPACE</span></div>
              <i></i>
              <div><strong>AI</strong><span>ASSISTED INSIGHTS</span></div>
            </div>
          </div>

          <div className="hero-art">
            <div className="art-orbit orbit-one"></div>
            <div className="art-orbit orbit-two"></div>
            <div className="food-emoji">🥑</div>
            <div className="art-chip chip-top">
              <span className="chip-dot"></span> Food intelligence
            </div>
            <div className="art-chip chip-bottom">
              <Sparkles size={15} /> Insights for everyday choices
            </div>
            <div className="art-leaf leaf-a">✳</div>
            <div className="art-leaf leaf-b">✦</div>
            <div className="art-caption">
              NOURISH WITH KNOWLEDGE <span>✳</span>
            </div>
          </div>
        </section>

        <section className="feature-section" id="features">
          <div className="section-heading">
            <div>
              <div className="eyebrow">ONE PLATFORM, MANY PERSPECTIVES</div>
              <h2>Food has more to tell.</h2>
            </div>
            <p>Explore connected tools for everyday food decisions.</p>
          </div>

          <div className="feature-grid">
            {features.map(f => (
              <button
                key={f.id}
                className={`feature-card ${active === f.id ? 'chosen' : ''}`}
                onClick={() => {
                  selectFeature(f.id);
                  document.getElementById('workspace')?.scrollIntoView({
                    behavior: 'smooth'
                  });
                }}
              >
                <div className="card-top">
                  <span className="feature-icon"><f.icon size={21} /></span>
                  <span className="card-number">{f.number}</span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <div className="card-bottom">
                  <span>{f.tag}</span><ArrowUpRight size={17} />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="workspace-section" id="workspace">
          <div className="section-heading workspace-heading">
            <div>
              <div className="eyebrow">YOUR FOODVERSE STUDIO</div>
              <h2>Make an informed next move.</h2>
            </div>
            <span className="prototype-pill">
              <span className="pulse"></span> INTERACTIVE PROTOTYPE
            </span>
          </div>

          <div className="workspace">
            <aside className="workspace-side">
              <div className="side-label">WORKSPACE TOOLS</div>

              {features.map(f => (
                <button
                  key={f.id}
                  className={`tool-link ${active === f.id ? 'tool-active' : ''}`}
                  onClick={() => selectFeature(f.id)}
                >
                  <f.icon size={18} />
                  <span>{f.title}</span>
                  <ArrowUpRight size={14} />
                </button>
              ))}

              <div className="side-tip">
                <Sparkles size={17} />
                <strong>Small choices, better informed.</strong>
                <p>Explore food-related questions in one place.</p>
              </div>
            </aside>

            <div className="workspace-main">
              <div className="panel-title">
                <div className="panel-icon"><selected.icon size={20} /></div>
                <div>
                  <span className="eyebrow">{selected.tag}</span>
                  <h3>{selected.title}</h3>
                </div>
                <span className="panel-step">{selected.number} / 04</span>
              </div>

              <p className="panel-desc">{selected.desc}</p>

              {active === 'vision' && (
                <div
                  className="upload-area"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    chooseFile(e.dataTransfer.files?.[0]);
                  }}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={e => {
                      chooseFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />

                  {preview
                    ? <img className="preview-image" src={preview} alt="Selected food" />
                    : <div className="upload-symbol"><Upload size={23} /></div>}

                  <strong>{file ? file.name : 'Drop a food image here'}</strong>
                  <span>or click to browse · JPG, PNG, WEBP</span>
                  <small>Maximum file size: 8 MB</small>
                </div>
              )}

              {active === 'cook' && (
                <div className="form-fields">
                  <label>
                    INGREDIENTS YOU HAVE
                    <textarea
                      value={ingredients}
                      onChange={e => setIngredients(e.target.value)}
                      placeholder="e.g. tomatoes, rice, spinach, paneer"
                      rows="3"
                    />
                  </label>

                  <label>
                    DIETARY PREFERENCE
                    <select value={dietary} onChange={e => setDietary(e.target.value)}>
                      <option>No preference</option>
                      <option>Vegetarian</option>
                      <option>Vegan</option>
                      <option>Egg-free</option>
                      <option>Dairy-free</option>
                    </select>
                  </label>
                </div>
              )}

              {active === 'nutrition' && (
                <div className="form-fields">
                  <label>
                    YOUR MEAL-PLANNING FOCUS
                    <select value={goal} onChange={e => setGoal(e.target.value)}>
                      <option>Balanced meals</option>
                      <option>More plant-based foods</option>
                      <option>Higher-protein meal ideas</option>
                      <option>Simple budget-friendly meals</option>
                    </select>
                  </label>

                  <label>
                    DIETARY PREFERENCE
                    <select value={dietary} onChange={e => setDietary(e.target.value)}>
                      <option>No preference</option>
                      <option>Vegetarian</option>
                      <option>Vegan</option>
                      <option>Egg-free</option>
                      <option>Dairy-free</option>
                    </select>
                  </label>
                </div>
              )}

              {active === 'hygiene' && (
                <div className="hygiene-list">
                  {[
                    'Clean food-contact surfaces',
                    'Separate raw and ready-to-eat foods',
                    'Wash hands and utensils',
                    'Cook and store food appropriately'
                  ].map(item => (
                    <div key={item}>
                      <CheckCircle2 size={17} /> {item}
                    </div>
                  ))}
                </div>
              )}

              <button className="run-btn" disabled={busy} onClick={runAction}>
                {busy ? (
                  <>
                    <LoaderCircle className="spin" size={17} />
                    Working…
                  </>
                ) : (
                  <>
                    <Sparkles size={17} />
                    {active === 'vision' ? 'Review uploaded image' :
                     active === 'cook' ? 'Suggest a recipe' :
                     active === 'nutrition' ? 'Build meal suggestions' :
                     'Show hygiene checklist'}
                    <ArrowUpRight size={16} />
                  </>
                )}
              </button>

              {error && <div className="error-box">{error}</div>}

              {renderResult()}

              <p className="disclaimer">
                <ShieldCheck size={14} />
                Food safety and nutrition information is guidance only.
                Visual appearance cannot confirm food safety.
              </p>
            </div>
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="about-symbol"><Utensils size={23} /></div>
          <div>
            <div className="eyebrow">ABOUT FOOD VERSE AI</div>
            <h2>Connected thinking for a more food-aware world.</h2>
            <p>
              Food Verse AI is a modular prototype exploring food image
              analysis, recipe ideas, meal planning and food hygiene.
              Its AI analysis depends on the configured language-model service.
            </p>
          </div>
          <div className="about-tag">
            BUILT FOR EXPLORATION <Sparkles size={16} />
          </div>
        </section>
      </main>

      <footer>
        <a className="brand footer-brand" href="#">
          <span className="brand-mark"><Leaf size={17} /></span>
          <span>food<span className="brand-light">verse</span>
            <small>INTELLIGENCE, REIMAGINED</small>
          </span>
        </a>
        <span>Food Verse AI · Multimodal Food Intelligence Agent</span>
        <a href="#workspace">Back to workspace ↑</a>
      </footer>
    </div>
  );
}
