/* =========================================
   STATE MANAGEMENT & VARIABLES
   ========================================= */
let questData = [];
let currentQuestionIndex = 0;
let score = 0; // Represents Billable Hours
let streak = 0; // Represents Flow State
let lives = 3; // Cups of Coffee
let hintUsed = false;

// DOM Elements - Screens
const introScreen = document.getElementById('intro-screen');
const quizCard = document.getElementById('quiz-card');
const gameOverScreen = document.getElementById('game-over-screen');

// DOM Elements - HUD & Progress
const scoreDisplay = document.getElementById('score-display');
const streakDisplay = document.getElementById('streak-display');
const progressFill = document.getElementById('progress-fill');
const heroTracker = document.getElementById('hero-tracker');
const themeToggle = document.getElementById('theme-toggle');
const hintBtn = document.getElementById('hint-btn');

// DOM Elements - Question Area
const blueprintTag = document.getElementById('blueprint-tag');
const skillTag = document.getElementById('skill-tag');
const questionText = document.getElementById('question-text');
const mcqLayout = document.getElementById('mcq-layout');
const tbsLayout = document.getElementById('tbs-layout');
const exhibitsContainer = document.getElementById('exhibits-container');
const tasksContainer = document.getElementById('tasks-container');

// DOM Elements - Feedback
const feedbackContainer = document.getElementById('feedback-container');
const feedbackBanner = document.getElementById('feedback-banner');
const feedbackMessage = document.getElementById('feedback-message');
const feedbackExplanation = document.getElementById('feedback-explanation');
const nextBtn = document.getElementById('next-btn');

/* =========================================
   INITIALIZATION & FETCHING
   ========================================= */
async function initQuest() {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) throw new Error("Failed to load workpapers.");
        questData = await response.json();
        console.log(`Loaded ${questData.length} workpapers from the client!`);
    } catch (error) {
        console.error(error);
        questionText.innerText = "Error loading audit files! Ensure you are running a local server (like Live Server in VS Code).";
    }
}

document.getElementById('start-btn').addEventListener('click', () => {
    if (questData.length === 0) return; 
    introScreen.classList.add('hidden');
    quizCard.classList.remove('hidden');
    renderQuestion();
});

/* =========================================
   RENDERING LOGIC
   ========================================= */
function renderQuestion() {
    // Reset state for new question
    feedbackContainer.classList.add('hidden');
    mcqLayout.innerHTML = '';
    exhibitsContainer.innerHTML = '';
    tasksContainer.innerHTML = '';
    hintUsed = false;
    hintBtn.style.opacity = '1';
    hintBtn.disabled = false;

    const q = questData[currentQuestionIndex];

    // Update Audit Timeline
    const progressPercent = (currentQuestionIndex / questData.length) * 100;
    progressFill.style.width = `${progressPercent}%`;
    heroTracker.style.left = `${progressPercent}%`;

    // Update Metadata Tags
    blueprintTag.innerText = q.blueprintArea;
    skillTag.innerText = q.skillLevel;
    questionText.innerText = q.questionText;

    // Route to proper layout
    if (q.questionType === "MCQ") {
        mcqLayout.classList.remove('hidden');
        tbsLayout.classList.add('hidden');
        renderMCQ(q);
    } else if (q.questionType === "TBS") {
        mcqLayout.classList.add('hidden');
        tbsLayout.classList.remove('hidden');
        renderTBS(q);
    }
}

function renderMCQ(q) {
    q.options.forEach(option => {
        const btn = document.createElement('button');
        btn.classList.add('option-btn');
        btn.innerText = `${option.id}. ${option.text}`;
        btn.dataset.id = option.id; 
        
        btn.addEventListener('click', () => checkAnswer(btn, q));
        mcqLayout.appendChild(btn);
    });
}

function renderTBS(q) {
    // Render Exhibits (Client Documents/Emails)
    q.exhibits.forEach(exhibit => {
        const div = document.createElement('div');
        div.classList.add('exhibit-doc');
        div.innerHTML = `<strong>${exhibit.title}</strong><br><br>${exhibit.content.replace(/\n/g, '<br>')}`;
        exhibitsContainer.appendChild(div);
    });

    // Render Tasks (Dropdowns)
    q.tasks.forEach(task => {
        const div = document.createElement('div');
        div.classList.add('task-item');
        
        const label = document.createElement('label');
        label.innerText = task.prompt;
        
        const select = document.createElement('select');
        select.id = `task-${task.taskId}`;
        
        // Add a default blank option
        const defaultOpt = document.createElement('option');
        defaultOpt.value = "";
        defaultOpt.innerText = "-- Select an Audit Procedure --";
        select.appendChild(defaultOpt);

        task.options.forEach(optText => {
            const opt = document.createElement('option');
            opt.value = optText;
            opt.innerText = optText;
            select.appendChild(opt);
        });

        div.appendChild(label);
        div.appendChild(select);
        tasksContainer.appendChild(div);
    });

    // Handle TBS Submit
    const submitBtn = document.getElementById('submit-tbs-btn');
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
    
    newSubmitBtn.addEventListener('click', () => {
        const selectedValue = document.getElementById(`task-${q.tasks[0].taskId}`).value;
        if (!selectedValue) return alert("You must select a procedure from the dropdown before signing off!");
        checkTBSAnswer(selectedValue, q, newSubmitBtn);
    });
}

/* =========================================
   GAME MECHANICS & LOGIC
   ========================================= */
function checkAnswer(selectedBtn, q) {
    const allBtns = mcqLayout.querySelectorAll('.option-btn');
    allBtns.forEach(btn => btn.disabled = true);
    hintBtn.disabled = true;

    const isCorrect = selectedBtn.dataset.id === q.correctAnswer;
    
    if (isCorrect) {
        selectedBtn.classList.add('correct');
        handleSuccess(q);
    } else {
        selectedBtn.classList.add('wrong');
        const correctBtn = Array.from(allBtns).find(b => b.dataset.id === q.correctAnswer);
        if (correctBtn) correctBtn.classList.add('correct');
        handleFailure(q);
    }
}

function checkTBSAnswer(selectedValue, q, submitBtn) {
    submitBtn.disabled = true;
    hintBtn.disabled = true;
    const isCorrect = selectedValue === q.tasks[0].correctAnswer;

    if (isCorrect) {
        handleSuccess(q);
    } else {
        handleFailure(q);
    }
}

function handleSuccess(q) {
    // Calculate billable hours based on risk level
    let hours = 2; // Default low risk
    if (q.skillLevel === "Medium Risk") hours = 4;
    if (q.skillLevel === "High Risk") hours = 6;
    if (q.skillLevel === "Critical Risk") hours = 10; 

    score += hours;
    streak++;
    updateHUD();

    showFeedback(true, q.feedback.success, q.feedback.explanation);
}

function handleFailure(q) {
    streak = 0; // Break Flow State
    lives--; // Spill Coffee
    updateHUD();

    // Update Coffee UI
    const coffee = document.getElementById(`coffee-${lives + 1}`);
    if (coffee) {
        coffee.classList.add('empty');
        coffee.innerText = '💤'; // Fall asleep icon
    }

    if (lives <= 0) {
        setTimeout(endGame, 1500);
    }

    showFeedback(false, q.feedback.failure, q.feedback.explanation);
}

function updateHUD() {
    scoreDisplay.innerText = `Billable Hours: ${score} 💵`;
    streakDisplay.innerText = `Flow State: ${streak} 🧠`;

    if (streak >= 3) {
        streakDisplay.classList.add('streak-hot');
    } else {
        streakDisplay.classList.remove('streak-hot');
    }
}

function showFeedback(isSuccess, message, explanation) {
    feedbackContainer.classList.remove('hidden');
    feedbackBanner.className = isSuccess ? 'feedback-success' : 'feedback-error';
    feedbackMessage.innerText = message;
    feedbackExplanation.innerText = explanation;
}

/* =========================================
   NAVIGATION & ABILITIES
   ========================================= */
nextBtn.addEventListener('click', () => {
    currentQuestionIndex++;
    if (currentQuestionIndex >= questData.length) {
        endGame();
    } else {
        renderQuestion();
    }
});

// "Consult the Partner" (Hint - Removes 2 wrong MCQ answers)
hintBtn.addEventListener('click', () => {
    if (hintUsed || questData[currentQuestionIndex].questionType !== "MCQ") return;
    
    const q = questData[currentQuestionIndex];
    const allBtns = Array.from(mcqLayout.querySelectorAll('.option-btn'));
    
    const wrongBtns = allBtns.filter(btn => btn.dataset.id !== q.correctAnswer);
    wrongBtns.sort(() => 0.5 - Math.random());
    wrongBtns[0].style.display = 'none';
    wrongBtns[1].style.display = 'none';

    hintUsed = true;
    hintBtn.style.opacity = '0.3';
    hintBtn.disabled = true;
});

// Theme Toggle: Morning Grind <-> Busy Season
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('busy-season');
    document.body.classList.toggle('morning-grind');
});

/* =========================================
   END GAME
   ========================================= */
function endGame() {
    quizCard.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');

    const endTitle = document.getElementById('end-title');
    const endScore = document.getElementById('end-score-text');
    const endRank = document.getElementById('end-rank-text');

    if (lives <= 0) {
        endTitle.innerText = "You fell asleep at your desk... 💤";
        endScore.innerText = `You managed to bill ${score} hours before passing out.`;
        endRank.innerText = "The Partner had to finish your workpapers. Try drinking more coffee next year.";
    } else {
        const maxPossibleHours = 52; // Rough max for the JSON
        const percentage = score / maxPossibleHours;

        endTitle.innerText = "Audit Concluded! 💼";
        endScore.innerText = `Total Billable Hours: ${score} 💵`;

        if (percentage >= 0.8) {
            endRank.innerText = "Performance Review: 🚀 Partner Track";
            triggerConfetti();
        } else if (percentage >= 0.5) {
            endRank.innerText = "Performance Review: 👔 Solid Senior Auditor";
        } else {
            endRank.innerText = "Performance Review: 📉 Staff I (Needs Improvement)";
        }
    }
}

document.getElementById('restart-btn').addEventListener('click', () => {
    currentQuestionIndex = 0;
    score = 0;
    streak = 0;
    lives = 3;
    
    for (let i = 1; i <= 3; i++) {
        const coffee = document.getElementById(`coffee-${i}`);
        coffee.classList.remove('empty');
        coffee.innerText = '☕';
    }

    updateHUD();
    gameOverScreen.classList.add('hidden');
    introScreen.classList.remove('hidden');
});

// Corporate Confetti (Green and Gold)
function triggerConfetti() {
    if (typeof confetti === "function") {
        const duration = 3000;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 6,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#16a34a', '#fbbf24', '#ffffff'] // Green, Gold, White
            });
            confetti({
                particleCount: 6,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#16a34a', '#fbbf24', '#ffffff']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }
}

// Boot up the app
initQuest();