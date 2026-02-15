<template>
  <div class="game-modal-overlay" @click.self="$emit('close')">
    <div class="game-modal-content stats-modal-content">
      <div class="modal-title">Adventure Log</div>

      <div class="stats-section">
        <div class="section-heading">Lifetime Stats</div>
        <div class="summary-details">
          <div class="detail-item">
            <span class="label">Total Runs:&nbsp;</span>
            <span class="value">{{ totalRuns }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Wins / Losses:&nbsp;</span>
            <span class="value">{{ wins }} / {{ losses }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Win Rate:&nbsp;</span>
            <span class="value">{{ winRate }}%</span>
          </div>
          <div class="detail-item">
            <span class="label">Total Clicks:&nbsp;</span>
            <span class="value">{{ totalClicks }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Avg Clicks / Run:&nbsp;</span>
            <span class="value">{{ avgClicks }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Total Play Time:&nbsp;</span>
            <span class="value">{{ totalPlayTime }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Avg Run Time:&nbsp;</span>
            <span class="value">{{ avgRunTime }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Total Combats:&nbsp;</span>
            <span class="value">{{ totalCombats }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Favorite Class:&nbsp;</span>
            <span class="value">{{ favoriteClass }}</span>
          </div>
          <div class="detail-item" v-if="bestVictoryTime">
            <span class="label">Best Victory Time:&nbsp;</span>
            <span class="value">{{ bestVictoryTime }}</span>
          </div>
          <div class="detail-item" v-if="fewestVictoryClicks !== null">
            <span class="label">Fewest Victory Clicks:&nbsp;</span>
            <span class="value">{{ fewestVictoryClicks }}</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <div class="section-heading">Run History</div>
        <div class="run-history-table-wrapper" v-if="runs.length > 0">
          <table class="run-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Result</th>
                <th>Class</th>
                <th>Clicks</th>
                <th>Time</th>
                <th>Combats</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="run in sortedRuns" :key="run.id">
                <td>{{ formatDate(run.date) }}</td>
                <td :class="run.result === 'victory' ? 'result-win' : 'result-loss'">
                  {{ run.result === 'victory' ? 'Victory' : 'Defeat' }}
                </td>
                <td>{{ run.playerClass || '—' }}</td>
                <td>{{ run.clicks }}</td>
                <td>{{ run.timer || '—' }}</td>
                <td>{{ run.combatEncounters ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="no-runs">No runs recorded yet.</div>
      </div>

      <div class="modal-buttons">
        <button v-if="runs.length > 0" @click="handleClear">> Clear History</button>
        <button @click="$emit('close')">> Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { loadRunHistory, clearRunHistory } from '@/utils/statsStorage';

const emit = defineEmits(['close']);

const runs = ref(loadRunHistory());

const sortedRuns = computed(() => [...runs.value].reverse());

const totalRuns = computed(() => runs.value.length);
const wins = computed(() => runs.value.filter(r => r.result === 'victory').length);
const losses = computed(() => runs.value.filter(r => r.result === 'defeat').length);
const winRate = computed(() => {
  if (totalRuns.value === 0) return 0;
  return Math.round((wins.value / totalRuns.value) * 100);
});

const totalClicks = computed(() => runs.value.reduce((sum, r) => sum + (r.clicks || 0), 0));
const avgClicks = computed(() => {
  if (totalRuns.value === 0) return 0;
  return Math.round(totalClicks.value / totalRuns.value);
});

const totalSeconds = computed(() => runs.value.reduce((sum, r) => sum + (r.timerSeconds || 0), 0));
const totalPlayTime = computed(() => formatSeconds(totalSeconds.value));
const avgRunTime = computed(() => {
  if (totalRuns.value === 0) return '00:00';
  return formatSeconds(Math.round(totalSeconds.value / totalRuns.value));
});

const totalCombats = computed(() => runs.value.reduce((sum, r) => sum + (r.combatEncounters || 0), 0));

const favoriteClass = computed(() => {
  if (runs.value.length === 0) return '—';
  const counts = {};
  runs.value.forEach(r => {
    if (r.playerClass) {
      counts[r.playerClass] = (counts[r.playerClass] || 0) + 1;
    }
  });
  const entries = Object.entries(counts);
  if (entries.length === 0) return '—';
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
});

const victories = computed(() => runs.value.filter(r => r.result === 'victory'));

const bestVictoryTime = computed(() => {
  if (victories.value.length === 0) return null;
  const best = Math.min(...victories.value.map(r => r.timerSeconds || Infinity));
  return best === Infinity ? null : formatSeconds(best);
});

const fewestVictoryClicks = computed(() => {
  if (victories.value.length === 0) return null;
  return Math.min(...victories.value.map(r => r.clicks || Infinity));
});

function formatSeconds(s) {
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function handleClear() {
  if (confirm('Clear all run history? This cannot be undone.')) {
    clearRunHistory();
    runs.value = [];
  }
}
</script>

<style scoped>
* {
  font-family: "IBM Plex Sans", sans-serif;
  font-optical-sizing: auto;
}

@keyframes fade-in-overlay {
  from { opacity: 0; }
  to { opacity: 1; }
}

.game-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  animation: fade-in-overlay 0.3s ease-out forwards;
  background-color: rgba(0, 0, 0, 0.5);
}

.game-modal-content {
  background-color: rgba(32, 32, 32, 0.95);
  padding: 2rem;
  border-radius: 12px;
  text-align: start;
  max-width: 480px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(37, 37, 37, 0.671);
  animation: pop-in 0.3s ease;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.modal-title {
  text-align: center;
  font-size: 28px;
  color: #ffffff;
  border-bottom: 1px solid rgb(155, 152, 152);
  padding-bottom: 15px;
  width: 100%;
}

.stats-section {
  width: 100%;
}

.section-heading {
  font-size: 16px;
  font-weight: 600;
  color: rgb(155, 152, 152);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-details {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  text-align: left;
  font-size: 15px;
}

.detail-item {
  display: flex;
  justify-content: center;
  padding: 0.2rem 0;
}

.label {
  font-weight: 600;
  color: #ffffff;
}

.value {
  color: #ffffff;
}

.run-history-table-wrapper {
  width: 100%;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
}

.run-history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: #ffffff;
}

.run-history-table th {
  text-align: left;
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid rgb(80, 80, 80);
  font-weight: 600;
  color: rgb(155, 152, 152);
  position: sticky;
  top: 0;
  background-color: rgba(32, 32, 32, 0.95);
}

.run-history-table td {
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid rgba(80, 80, 80, 0.3);
}

.result-win {
  color: #4caf50;
  font-weight: 600;
}

.result-loss {
  color: #ef5350;
  font-weight: 600;
}

.no-runs {
  color: rgb(155, 152, 152);
  font-size: 14px;
  text-align: center;
  padding: 1rem 0;
}

.modal-buttons {
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: flex-start;
  margin-top: 0.5rem;
}

.modal-buttons button {
  border: none;
  background-color: transparent;
  font-size: 17px;
  margin-bottom: 0.5rem;
  color: #ffffff;
  font-weight: 400;
  padding: 0;
  cursor: pointer;
}

.modal-buttons button:hover {
  color: rgb(28, 128, 158);
}

@keyframes pop-in {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@media screen and (max-width: 600px) {
  .game-modal-content {
    padding: 1.5rem;
    gap: 0.6rem;
  }
  .modal-title {
    font-size: 24px;
  }
  .summary-details {
    font-size: 13px;
  }
  .modal-buttons button {
    font-size: 14px;
  }
  .run-history-table {
    font-size: 11px;
  }
}
</style>
