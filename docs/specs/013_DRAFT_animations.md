# 🎬 Animation System Specification

## 🎯 Goal

Create a **calm, responsive, and rewarding animation system** that reinforces real-life progress without feeling like a game.

All animations must:

* Be fast (150–400ms typical)
* Use smooth ease-out curves
* Be subtle and purposeful (no decorative motion)

---

# 🔥 1. Task Completion Animation (PRIMARY)

## Sequence:

### Step 1: Checkbox Interaction (0–120ms)

* Circle fills smoothly
* Checkmark draws itself (not instant)

### Step 2: Task Settling (120–300ms)

* Scale: 100% → 98%
* Opacity: ~70%
* Apply subtle “completed” background tint

### Step 3: Reward Feedback (300–800ms)

* Show floating element near task:

  +{momentum} Momentum
  {quest icon} {quest name}

* Animation:

    * Fade in
    * Translate upward (8–12px)
    * Fade out

### Step 4: Task Exit (~800ms+)

* Either:

    * Fade out + collapse height
      OR
    * Slight slide (left) + fade out

---

# ⚡ 2. Progress Bar Animation

* Trigger: whenever quest gains momentum
* Animate width change (no jumps)
* Duration: 400–600ms
* Easing: ease-out
* Optional: subtle pulse/glow at end of bar

---

# 🔥 3. Momentum / “On a Roll” Feedback

## Trigger:

* After completing 2–3 tasks in short succession

## Behavior:

* Show message:

  🔥 You're on a roll

* Animation:

    * Scale: 95% → 100%
    * Soft fade-in
    * Optional subtle glow/pulse

---

# 🧩 4. Touch / Press Feedback (Mobile-first)

## On press:

* Scale: 100% → 98%
* Reduce shadow/elevation

## On release:

* Return to normal size smoothly

---

# 🎯 5. Quest Tag Animation

## When linking a task to a quest:

* Tag appears with:

    * Scale: 90% → 100%
    * Fade-in
    * Subtle color fill transition

---

# 🧭 6. Quest Progress Feedback

## When quest receives momentum:

* Progress bar animates (see section 2)
* Quest icon:

    * Subtle pulse OR glow
    * No bouncing or exaggerated motion

---

# 🌊 7. Screen Transitions

## For view changes (Day / Week / Month):

* Use:

    * Fade transition
    * Small slide (8–16px)

## Avoid:

* Zooms
* Large directional transitions
* Long animations

---

# 🎯 8. Focus Mode Entry

## When entering focus mode:

* Background slightly dims
* Active task/quest:

    * Scales up slightly (e.g. 100% → 102%)
    * Gains elevation/shadow

---

# ⚠️ Global Constraints

* No animation > 600ms (except passive fades)
* No multiple competing animations at once
* No “bouncy” or overly springy motion
* No purely decorative animations

---

# 🧠 Design Intent

Each animation must communicate one of:

* Action acknowledged
* Progress updated
* State changed
* User interaction confirmed

---

# 🎯 Priority Implementation

1. Task completion sequence (full flow)
2. Progress bar animation
3. Floating momentum feedback
4. Touch feedback
5. “On a roll” feedback

---

# ✅ Expected Result

Animations should make the app feel:

* Alive
* Responsive
* Rewarding

Without ever feeling:

* Distracting
* Game-like
* Overstimulating
