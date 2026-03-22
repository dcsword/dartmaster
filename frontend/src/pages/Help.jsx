import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    content: [
      {
        heading: 'Guest vs registered player',
        text: 'You can play without an account — just type a name and start. But if you create a free account, your game history and stats are saved permanently and accessible from any device.',
      },
      {
        heading: 'Creating an account',
        text: 'Tap Profile → Sign In → Register. You need a display name (shown on the scoreboard), a unique @username (used to log in), an email and a password. Everything except email and password can be changed later from your profile.',
      },
      {
        heading: 'Signing in',
        text: 'Use your @username or email address plus your password. Once signed in, your name appears automatically as Player 1 whenever you set up a game.',
      },
      {
        heading: 'Guest players',
        text: 'Players without accounts are called guests. Their game history is saved on the device they played on. If they clear their browser data or switch devices, their history is lost. Encourage your regular opponents to create accounts.',
      },
    ],
  },
  {
    id: 'setup',
    title: 'Setting Up a Game',
    icon: '🎮',
    content: [
      {
        heading: 'Game mode',
        text: 'Singles — up to 4 individual players, each with their own score. Teams — 2 to 4 teams of 2 players each. The team shares a single score and players within a team alternate throwing each round.',
      },
      {
        heading: 'Finish rule',
        text: 'Double Out — you must finish on a double (the most common pub rule). Straight Out — any dart can finish the game. Triple Out — you must finish on a triple (expert rule).',
      },
      {
        heading: 'Match format',
        text: 'A match is made up of sets, and each set is made up of legs. Use the presets (Casual, Bo3, Bo5) or set custom numbers. Best of X means you need to win the majority — Best of 3 = first to 2. First to X means exactly that number.',
      },
      {
        heading: 'Player order',
        text: 'The order you see in the player list is the throwing order — Player 1 throws first. Drag the ⠿ handle to reorder players before starting. The starting player rotates each new leg automatically.',
      },
      {
        heading: 'Room system',
        text: 'If you are signed in, tap 🔗 Create Room to get a 6-character code and QR code. Your friends scan the QR or type the code on their device. As they join, they appear in the room panel and you can tap + Add to add them to the player list. The room expires after 15 minutes.',
      },
      {
        heading: 'Adding friends by name',
        text: 'Only registered players can be searched by name. Guests always need the room system. This protects everyone\'s privacy — you can\'t add someone to a game without them knowing.',
      },
    ],
  },
  {
    id: 'playing',
    title: 'Playing a Game',
    icon: '🎯',
    content: [
      {
        heading: 'The score display',
        text: 'The large number in the middle is the current player\'s remaining score. Other players\' scores are shown smaller. The active player is highlighted. On iPad landscape and desktop you see all scores on the left side.',
      },
      {
        heading: 'Entering a dart',
        text: 'First select your multiplier — S (single), D (double), T (triple). Then tap the number on the numpad. Example: for Triple 20 (T20), tap T then 20. The dart appears in the D1/D2/D3 slots at the top.',
      },
      {
        heading: 'Bull buttons',
        text: 'Bull 25 is the outer bull (25 points). Bull 50 is the bullseye (50 points, counts as a double for finishing purposes in Double Out).',
      },
      {
        heading: 'Miss button',
        text: 'Tap Miss if a dart lands outside the scoring area or misses the board entirely. It records a 0 score for that dart.',
      },
      {
        heading: 'Undo button (↩)',
        text: 'Remove the last dart entered in the current turn. You can undo all three darts if needed, but you cannot undo a turn once it has been submitted.',
      },
      {
        heading: 'Done button',
        text: 'Submit your turn after entering 1, 2 or 3 darts. You do not have to throw all 3 darts — if you finish on dart 1 or 2, tap Done immediately. The button shows how many darts have been entered.',
      },
      {
        heading: 'Bust button',
        text: 'If your darts would take your score below zero, to exactly 1, or you failed to finish on a double (in Double Out), you are bust. Tap BUST to record the turn and reset your score to what it was before the turn.',
      },
      {
        heading: 'Checkout suggestions',
        text: 'When your remaining score is 170 or below, a green suggestion appears showing the optimal way to finish. For example at 170 it suggests T20 → T20 → Bull. This is a guide only — you can throw any combination.',
      },
      {
        heading: 'Winning a leg',
        text: 'When you finish, a summary screen shows who won the leg and the current score. Tap the button to start the next leg. The starting player rotates automatically.',
      },
    ],
  },
  {
    id: 'rules',
    title: 'Dart Rules',
    icon: '📋',
    content: [
      {
        heading: '501 — the game',
        text: 'Every player starts with 501 points. You take turns throwing 3 darts each round. The score of each dart is subtracted from your total. The first player to reach exactly zero wins the leg.',
      },
      {
        heading: 'Scoring zones',
        text: 'Single — the main segment (1–20 points). Double — the thin outer ring (2× the segment value). Triple — the thin inner ring (3× the segment value). Outer bull — the outer circle (25 points). Bullseye — the centre (50 points).',
      },
      {
        heading: 'Maximum single throw',
        text: 'The highest single dart score is Triple 20 = 60 points. The maximum for a 3-dart turn is T20 + T20 + T20 = 180 points, known as a "maximum" or "ton-eighty".',
      },
      {
        heading: 'Double Out rule',
        text: 'The most common pub rule. To win, your final dart must land in a double or the bullseye. If you score too many and go below zero, OR reach exactly 1 (impossible to finish), that turn is a bust and your score resets to what it was before the turn.',
      },
      {
        heading: 'Straight Out rule',
        text: 'No restriction on the finishing dart — any segment can win. Much easier than Double Out, good for beginners or casual games.',
      },
      {
        heading: 'Triple Out rule',
        text: 'Advanced rule — your final dart must land in a triple. Very difficult. Not recommended for casual play.',
      },
      {
        heading: 'Bust in Double Out',
        text: 'You bust if: (a) your score goes below zero, (b) your score reaches exactly 1 (you cannot finish from 1 as there is no double 0.5), or (c) your last dart does not land in a double when your score reaches zero.',
      },
      {
        heading: 'Legs and sets',
        text: 'A leg is one game of 501. A set is a group of legs — first to win the required number of legs wins the set. A match is a group of sets. In Best of 3 sets, first to 2 sets wins the match. Leg count resets to zero at the start of each new set.',
      },
      {
        heading: 'Starting player rotation',
        text: 'In proper darts, the starting player rotates each leg. Player 1 starts leg 1, Player 2 starts leg 2, and so on. DartMaster handles this automatically.',
      },
      {
        heading: 'Common checkouts',
        text: '170 (T20+T20+Bull) is the highest possible checkout. 167, 166, 169, 168, 165, 163, 162, 159 cannot be finished in 3 darts. Any other score of 170 or below can be finished in 3 darts or fewer.',
      },
    ],
  },
  {
    id: 'profile',
    title: 'Profile & Settings',
    icon: '👤',
    content: [
      {
        heading: 'Display name vs username',
        text: 'Your display name is shown on the scoreboard and history — it can be anything, like "Dogancan". Your @username is your unique identifier used to log in and to be found by other players. You can change your display name but your username should stay consistent.',
      },
      {
        heading: 'App theme color',
        text: 'Go to Profile → Edit → App theme color. Choose between Red (default), Cyan, Amber or Green. This changes the accent color throughout the entire app — scores, buttons, highlights. Each player on the same device can have a different color when they log in.',
      },
      {
        heading: 'Avatar color',
        text: 'The colored circle showing your initial on the scoreboard. Choose any color from the palette in your profile edit screen. This is separate from the app theme color.',
      },
      {
        heading: 'Profile information',
        text: 'You can optionally add your first and last name, a short bio, country, city, birthday and preferred throwing hand. None of this is required. It helps personalise your profile if you share the app with a group of friends.',
      },
      {
        heading: 'Viewing your history',
        text: 'Tap the History tab to see all your finished games. If you are signed in, you see only your games. If you are a guest, you see games played on this device.',
      },
      {
        heading: 'Signing out',
        text: 'On the sidebar (tablet/desktop) there is a sign out link below your name. On mobile, go to your Profile page and you will find the sign out option at the top.',
      },
    ],
  },
  {
    id: 'rooms',
    title: 'Room System',
    icon: '🔗',
    content: [
      {
        heading: 'What is a room?',
        text: 'A room is a temporary lobby that lets you invite registered players to your game without searching for them by name. It solves the privacy problem — someone can only join your game if they physically have the code.',
      },
      {
        heading: 'Creating a room',
        text: 'You must be signed in to create a room. Go to New Game, make sure Singles or Teams is selected, then tap 🔗 Create Room. A 6-character code and QR code appear.',
      },
      {
        heading: 'Joining a room',
        text: 'Your friends tap Join a Room on the home screen. They can either type the code manually or tap Scan QR Code and point their camera at your screen. They must be signed in to join.',
      },
      {
        heading: 'Adding room members to the game',
        text: 'As friends join the room, they appear in the room panel with a green status. Tap + Add next to each person to add them to the player slots. You can reorder players using the drag handles after adding.',
      },
      {
        heading: 'Room expiry',
        text: 'Rooms expire after 15 minutes. The countdown is shown on the room panel. If it expires, just create a new one — it only takes a second.',
      },
      {
        heading: 'Why do I need to be signed in?',
        text: 'The room system links real accounts together. This means when you play, each participant\'s real user ID is attached to the game, so the history appears correctly on everyone\'s profile afterwards.',
      },
    ],
  },
];

function AccordionItem({ section, isOpen, onToggle }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', background: 'none', border: 'none', padding: '16px 0',
          display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '22px', flexShrink: 0 }}>{section.icon}</span>
        <span style={{ flex: 1, fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>{section.title}</span>
        <span style={{ color: 'var(--muted)', fontSize: '18px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
          ↓
        </span>
      </button>

      {isOpen && (
        <div style={{ paddingBottom: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {section.content.map((item, i) => (
            <div key={i} style={{ paddingLeft: '34px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)', marginBottom: '5px', fontFamily: 'Barlow Condensed', letterSpacing: '0.04em' }}>
                {item.heading}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>
                {item.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Help() {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState('getting-started');

  function toggle(id) {
    setOpenSection(prev => prev === id ? null : id);
  }

  return (
    <Layout>
      <div className="page with-nav">

        <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: '48px', fontWeight: 800, color: 'var(--text)', lineHeight: 0.9, marginBottom: '6px' }}>GUIDE</h1>
        <p className="label-xs" style={{ marginBottom: '24px' }}>Everything you need to know</p>

        {/* Quick nav chips */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {SECTIONS.map(s => (
            <button key={s.id}
              className={`tag ${openSection === s.id ? 'active' : ''}`}
              onClick={() => {
                setOpenSection(s.id);
                setTimeout(() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
              }}
              style={{ fontSize: '11px' }}>
              {s.icon} {s.title}
            </button>
          ))}
        </div>

        {/* Accordion sections */}
        <div className="card" style={{ padding: '0 20px' }}>
          {SECTIONS.map(s => (
            <div key={s.id} id={s.id}>
              <AccordionItem
                section={s}
                isOpen={openSection === s.id}
                onToggle={() => toggle(s.id)}
              />
            </div>
          ))}
        </div>

        {/* Footer tip */}
        <div style={{ marginTop: '24px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>💡</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>New to darts?</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>
              Start with Casual mode (1 leg, Straight Out) so you don't have to worry about finishing on a double. Once comfortable, switch to Double Out — the standard pub rule used in competitions worldwide.
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
