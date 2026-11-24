import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RULES, type RuleEntry } from '../domain/rules';

export function RulesPage() {
  const [params] = useSearchParams();
  const topic = params.get('topic');

  useEffect(() => {
    if (topic) document.getElementById(`rule-${topic}`)?.scrollIntoView({ block: 'center' });
  }, [topic]);

  const entries = Object.entries(RULES) as [string, RuleEntry][];
  const sections = [...new Set(entries.map(([, e]) => e.section))];
  const openTodos = entries.filter(([, e]) => e.todo).length;

  return (
    <div className="page narrow rules">
      <h1>Rules</h1>
      <p className="muted">
        Everything behind the “?” icons. {openTodos} rule{openTodos === 1 ? ' is' : 's are'} still marked as placeholders.
      </p>
      {sections.map((section) => (
        <section key={section} className="card">
          <h2>{section}</h2>
          <dl>
            {entries
              .filter(([, e]) => e.section === section)
              .map(([key, e]) => (
                <div key={key} id={`rule-${key}`} className={`rule ${key === topic ? 'highlight' : ''}`}>
                  <dt>{e.title}</dt>
                  <dd>
                    {e.text && <p>{e.text}</p>}
                    {e.todo && (
                      <p className="rules-todo">
                        <span>Rules placeholder:</span> {e.todo}
                      </p>
                    )}
                    {e.link && <Link to={e.link.to}>{e.link.label} →</Link>}
                  </dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
