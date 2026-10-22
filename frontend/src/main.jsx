
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import { Client } from '@stomp/stompjs';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';
import './style.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

// Deployed Render backend
const API = 'https://intelligenttasksystem.onrender.com';

// Secure WebSocket connection
const WS = 'wss://intelligenttasksystem.onrender.com/ws';

const user = () => localStorage.getItem('email');

const headers = () => ({
  'X-User-Email': user()
});

// Login and Registration
function Login({ onLogin }) {
  const [r, setR] = useState(false);
  const [f, setF] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [err, setE] = useState('');

  async function go(e) {
    e.preventDefault();
    setE('');

    try {
      const x = await axios.post(
        API + '/api/auth/' + (r ? 'register' : 'login'),
        f
      );

      localStorage.setItem('token', x.data.token);
      localStorage.setItem('email', f.email);
      localStorage.setItem('name', x.data.name);

      onLogin();
    } catch (x) {
      const data = x.response?.data;

      setE(
        data?.detail ||
        data?.message ||
        (typeof data === 'string'
          ? data
          : 'Request failed. Check the backend and try again.')
      );
    }
  }

  return (
    <div className="auth">
      <form onSubmit={go}>
        <h1>TaskFlow</h1>
        <p>Intelligent Task Prioritization</p>

        {r && (
          <input
            placeholder="Name"
            required
            value={f.name}
            onChange={e =>
              setF({ ...f, name: e.target.value })
            }
          />
        )}

        <input
          placeholder="Email"
          type="email"
          required
          value={f.email}
          onChange={e =>
            setF({ ...f, email: e.target.value })
          }
        />

        <input
          placeholder="Password"
          type="password"
          required
          value={f.password}
          onChange={e =>
            setF({ ...f, password: e.target.value })
          }
        />

        <button type="submit">
          {r ? 'Register' : 'Login'}
        </button>

        {err && <small>{err}</small>}

        <a
          href="#"
          onClick={e => {
            e.preventDefault();
            setR(!r);
            setE('');
          }}
        >
          {r
            ? 'Already have an account? Login'
            : 'Create account'}
        </a>
      </form>
    </div>
  );
}

// Main TaskFlow Dashboard
function App() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState('');

  async function load() {
    try {
      const [a, b] = await Promise.all([
        axios.get(API + '/api/tasks', {
          headers: headers()
        }),
        axios.get(API + '/api/tasks/stats', {
          headers: headers()
        })
      ]);

      setTasks(a.data);
      setStats(b.data);
      setError('');
    } catch (e) {
      console.error('Failed to load tasks:', e);
      setError(
        'Could not load tasks. Check your backend and API configuration.'
      );
    }
  }

  useEffect(() => {
    load();

    const client = new Client({
      brokerURL: WS,
      reconnectDelay: 5000,

      onConnect: () => {
        client.subscribe(
          '/topic/tasks/' + localStorage.getItem('email'),
          () => load()
        );
      },

      onStompError: frame => {
        console.error('STOMP error:', frame.headers);
      },

      onWebSocketError: event => {
        console.error('WebSocket connection error:', event);
      }
    });

    client.activate();

    const id = setInterval(() => {
      setTasks(currentTasks => {
        currentTasks.forEach(t => {
          const diff =
            new Date(t.deadline).getTime() - Date.now();

          if (
            diff > 23 * 3600 * 1000 &&
            diff < 25 * 3600 * 1000 &&
            t.status !== 'COMPLETED'
          ) {
            if (
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              new Notification('Task due tomorrow', {
                body: t.title
              });
            }

            try {
              const audio = new Audio('/alarm.mp3');
              audio.play().catch(() => {});
            } catch (e) {
              console.error('Reminder audio error:', e);
            }
          }
        });

        return currentTasks;
      });
    }, 60000);

    if (
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission();
    }

    return () => {
      client.deactivate();
      clearInterval(id);
    };
  }, []);

  async function save(data) {
    try {
      if (edit) {
        await axios.put(
          API + '/api/tasks/' + edit.id,
          data,
          { headers: headers() }
        );
      } else {
        await axios.post(
          API + '/api/tasks',
          data,
          { headers: headers() }
        );
      }

      setShow(false);
      setEdit(null);
      await load();
    } catch (e) {
      console.error('Failed to save task:', e);
      alert(
        e.response?.data?.message ||
        'Unable to save the task. Please try again.'
      );
    }
  }

  async function del(id) {
    if (!confirm('Delete this task?')) return;

    try {
      await axios.delete(API + '/api/tasks/' + id, {
        headers: headers()
      });

      await load();
    } catch (e) {
      console.error('Failed to delete task:', e);
      alert('Unable to delete the task. Please try again.');
    }
  }

  const shown = tasks.filter(t =>
    (filter === 'ALL' || t.status === filter) &&
    `${t.title} ${t.description || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const chart = {
    labels: ['Pending', 'In Progress', 'Completed'],
    datasets: [
      {
        label: 'Tasks',
        data: [
          tasks.filter(x => x.status === 'PENDING').length,
          tasks.filter(x => x.status === 'IN PROGRESS').length,
          tasks.filter(x => x.status === 'COMPLETED').length
        ]
      }
    ]
  };

  return (
    <div className="app">
      <header>
        <div>
          <h2>TaskFlow</h2>
          <span>
            Welcome, {localStorage.getItem('name')}
          </span>
        </div>

        <button
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
        >
          Logout
        </button>
      </header>

      <main>
        {error && <p role="alert">{error}</p>}

        <section className="cards">
          {[
            ['Total', stats.total],
            ['Pending', stats.pending],
            ['Completed', stats.completed],
            ['Overdue', stats.overdue]
          ].map(([label, value]) => (
            <div className="card" key={label}>
              <b>{label}</b>
              <strong>{value ?? 0}</strong>
            </div>
          ))}
        </section>

        <section className="tools">
          <input
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="ALL">ALL</option>
            <option value="PENDING">PENDING</option>
            <option value="IN PROGRESS">IN PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>

          <button
            onClick={() => {
              setEdit(null);
              setShow(true);
            }}
          >
            + New Task
          </button>
        </section>

        <div className="grid">
          <section>
            <h3>Priority Queue</h3>

            {shown.map(t => (
              <article
                className={'task ' + (t.priority || 'low').toLowerCase()}
                key={t.id}
              >
                <div>
                  <h3>
                    {t.title}{' '}
                    <span>
                      {t.priority} · {t.priorityScore}
                    </span>
                  </h3>

                  <p>{t.description}</p>

                  <small>
                    Deadline: {new Date(t.deadline).toLocaleString()}
                    {' · '}
                    Effort: {t.estimatedHours}h
                  </small>
                </div>

                <div>
                  <select
                    value={t.status}
                    onChange={e =>
                      save({
                        ...t,
                        status: e.target.value
                      })
                    }
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="IN PROGRESS">IN PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>

                  <button
                    onClick={() => {
                      setEdit(t);
                      setShow(true);
                    }}
                  >
                    Edit
                  </button>

                  <button onClick={() => del(t.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}

            {shown.length === 0 && (
              <p>No tasks found.</p>
            )}
          </section>

          <aside>
            <h3>Productivity</h3>
            <Bar data={chart} />
          </aside>
        </div>
      </main>

      {show && (
        <TaskForm
          task={edit}
          close={() => {
            setShow(false);
            setEdit(null);
          }}
          save={save}
        />
      )}
    </div>
  );
}

// Create and Edit Task Form
function TaskForm({ task, close, save }) {
  const [f, setF] = useState(
    task
      ? {
          ...task,
          deadline: task.deadline
            ? task.deadline.slice(0, 16)
            : ''
        }
      : {
          title: '',
          description: '',
          deadline: '',
          importance: 3,
          estimatedHours: 2,
          status: 'PENDING'
        }
  );

  return (
    <div className="modal">
      <form
        onSubmit={e => {
          e.preventDefault();

          save({
            ...f,
            importance: Number(f.importance),
            estimatedHours: Number(f.estimatedHours)
          });
        }}
      >
        <h2>{task ? 'Edit' : 'Create'} Task</h2>

        <input
          required
          placeholder="Task name"
          value={f.title}
          onChange={e =>
            setF({ ...f, title: e.target.value })
          }
        />

        <textarea
          placeholder="Description"
          value={f.description || ''}
          onChange={e =>
            setF({ ...f, description: e.target.value })
          }
        />

        <label>
          Deadline
          <input
            required
            type="datetime-local"
            value={f.deadline}
            onChange={e =>
              setF({ ...f, deadline: e.target.value })
            }
          />
        </label>

        <label>
          Importance (1-5)
          <input
            required
            type="number"
            min="1"
            max="5"
            value={f.importance}
            onChange={e =>
              setF({ ...f, importance: e.target.value })
            }
          />
        </label>

        <label>
          Estimated hours
          <input
            required
            type="number"
            min="0.5"
            step="0.5"
            value={f.estimatedHours}
            onChange={e =>
              setF({ ...f, estimatedHours: e.target.value })
            }
          />
        </label>

        <div>
          <button type="submit">Save</button>
          <button type="button" onClick={close}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// Application Root
function Root() {
  const [ok, setOk] = useState(
    !!localStorage.getItem('token')
  );

  return ok
    ? <App />
    : <Login onLogin={() => setOk(true)} />;
}

createRoot(document.getElementById('root')).render(<Root />);
