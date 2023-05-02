import { IDOMRenderClass, IResult, ITaskClass, ITrainingClass, ITrainingState } from '@/types'
import { randomizeEntity, wait, words } from '@/utils'

class Task implements ITaskClass {
    word: string
    wordProgress: string
    randomizedWord: string
    currentLetterIndex: number
    currentErrCount: number
    maxErrorCount: number

    constructor(word: string, maxErrorCount: number, randomizedWord?: string, wordProgress?: string, currentLetterIndex?: number, currentErrCount?: number) {
        this.word = word
        this.maxErrorCount = maxErrorCount
        this.randomizedWord = randomizedWord || this.randomize(word)
        this.wordProgress = wordProgress || ''
        this.currentLetterIndex = currentLetterIndex || 0
        this.currentErrCount = currentErrCount || 0
    }

    get currentLetterSymbol() {
        return this.word[this.currentLetterIndex]
    }

    get isComplete(): boolean {
        return this.wordProgress === this.word && this.maxErrorCount !== this.currentErrCount
    }

    get isError(): boolean {
        return this.maxErrorCount === this.currentErrCount
    }

    randomize(word: string): string {
        const randomizedIndexes = randomizeEntity(word.length, word.length)
        const randomizedWord = randomizedIndexes.map(index => word[index]).join('')
        return randomizedWord === word ? this.randomize(word) : randomizedWord
    }

    handleLetter(letter: string): boolean {
        if (this.currentLetterSymbol === letter) {
            this.incrementProgress(letter)
            return true
        } else {
            this.setError()
            return false
        }
    }

    incrementProgress(letter: string) {
        const randomized = this.randomizedWord.split('')
        const letterIndex = randomized.indexOf(letter)
        randomized.splice(letterIndex, 1)

        this.currentLetterIndex += 1
        this.wordProgress += letter
        this.randomizedWord = randomized.join('')
    }

    setError() {
        this.currentErrCount += 1
        if (this.currentErrCount === this.maxErrorCount) {
            this.wordProgress = this.word
        }
    }
}

export class Training implements ITrainingClass {
    maxTaskCount: number = 6
    maxErrCount: number = 3
    currentTaskIndex: number = 0
    tasks: Array<ITaskClass> = []

    constructor(state ?: ITrainingState) {
        if (state) {
            this.restoreState(state)
            return
        }

        this.tasks = this.randomizeTasks()
    }

    get currentTask(): ITaskClass {
        return this.tasks[this.currentTaskIndex]
    }

    get isComplete(): boolean {
        return this.tasks.every(t => t.isComplete || t.isError)
    }

    get errorCount(): number {
        return this.tasks.reduce((acc, task) => {
            acc += task.currentErrCount
            return acc
        }, 0)
    }

    get tasksWithoutErrors(): number {
        return this.tasks.filter(t => t.currentErrCount === 0).length
    }

    get mostBrokenTask(): string {
        const taskErrors = this.tasks.map(t => t.currentErrCount)
        const maxErrCount = Math.max(...taskErrors)
        return (this.tasks.find(t => t.currentErrCount === maxErrCount) as ITaskClass).word
    }

    handleInput(letter: string) {
        const task = this.currentTask
        const isSuccess = task.handleLetter(letter)
        const result: IResult = {
            success: isSuccess,
            taskComplete: task.isComplete,
            taskError: task.isError,
            trainingComplete: false,
        }

        if (this.currentTask.isComplete || this.currentTask.isError) {
            this.currentTaskIndex += 1
            result.trainingComplete = this.isComplete
        }

        return result
    }

    randomizeTasks(): Array<ITaskClass> {
        const maxRandomIndex: number = words.length
        const randomizedIndexes = randomizeEntity(maxRandomIndex, this.maxTaskCount)

        return randomizedIndexes.map(index => new Task(words[index], this.maxErrCount))
    }

    restoreState(state: ITrainingState): void {
        this.maxTaskCount = state.maxTaskCount
        this.maxErrCount = state.maxErrCount
        this.currentTaskIndex = state.currentTaskIndex
        this.tasks = state.tasks.map(t => new Task(t.word, this.maxErrCount, t.randomizedWord, t.wordProgress, t.currentLetterIndex, t.currentErrCount))
    }
}

export class DOMTaskRender implements IDOMRenderClass {
    #currentQuestionContainer: HTMLElement = document.querySelector('#current_question') as HTMLElement
    #totalQuestionsContainer: HTMLElement = document.querySelector('#total_questions') as HTMLElement
    #answerContainer: HTMLElement = document.querySelector('#answer') as HTMLElement
    #lettersContainer: HTMLElement = document.querySelector('#letters') as HTMLElement

    #statsMainContainer: HTMLElement = document.querySelector('#stats') as HTMLElement
    #statsErrorCount: HTMLElement = document.querySelector('#errors_count') as HTMLElement
    #statsCleanTasks: HTMLElement = document.querySelector('#clean_task_count') as HTMLElement
    #statsMostBrokenTask: HTMLElement = document.querySelector('#most_broken_task') as HTMLElement

    #primaryClass: string = 'btn btn-primary m-1'
    #errorClass: string = 'btn btn-danger m-1'
    #successClass: string = 'btn btn-success m-1'
    #errorTimer?: NodeJS.Timeout
    isPending: boolean = false

    renderTraining(training: ITrainingClass, taskIndex?: number): void {
        const task = typeof taskIndex === 'number' ? training.tasks[taskIndex] : training.currentTask
        const taskNumber = typeof taskIndex === 'number' ? String(taskIndex + 1) : String(training.currentTaskIndex + 1)
        const taskCount = String(training.maxTaskCount)
        const random = task.randomizedWord
        const answer = task.wordProgress

        this.#currentQuestionContainer.innerText = taskNumber
        this.#totalQuestionsContainer.innerText = taskCount
        this.#lettersContainer.innerHTML = ''
        this.#answerContainer.innerHTML = ''
        this.#answerContainer.dataset.word = task.word

        if (task.isComplete) {
            answer.split('').map((letter, index) => {
                const letterElement = DOMTaskRender.createLetter(letter, index, this.#successClass)
                this.#answerContainer.appendChild(letterElement)
            })

            return
        }

        if (task.isError) {
            answer.split('').map((letter, index) => {
                const letterElement = DOMTaskRender.createLetter(letter, index, this.#errorClass)
                this.#answerContainer.appendChild(letterElement)
            })

            return
        }

        answer.split('').map((letter, index) => {
            const letterElement = DOMTaskRender.createLetter(letter, index, this.#successClass)
            this.#answerContainer.appendChild(letterElement)
        })

        random.split('').map((letter, index) => {
            const letterElement = DOMTaskRender.createLetter(letter, index, this.#primaryClass)
            this.#lettersContainer.appendChild(letterElement)
        })
    }

    async handleChange(training: ITrainingClass, changeResult: IResult, letter: string, index?: string) {
        const { success, taskError, taskComplete, trainingComplete } = changeResult

        if (success) {
            this.#renderSuccess(letter, index)
        } else {
            this.#renderError(letter, index)
            if (taskError) this.#renderFailure()
        }

        if (trainingComplete) {
            this.renderStats(training)
            return
        }

        if (taskError || taskComplete) {
            this.isPending = true
            await wait(1000)
            this.isPending = false

            this.renderTraining(training)
        }
    }

    renderStats(training: ITrainingClass): void {
        this.#statsMainContainer.style.visibility = 'visible'
        this.#statsErrorCount.innerText = String(training.errorCount)
        this.#statsCleanTasks.innerText = String(training.tasksWithoutErrors)
        this.#statsMostBrokenTask.innerText = `"${String(training.mostBrokenTask)}"`
    }

    #renderSuccess(letter: string, index?: string): void {
        const element = DOMTaskRender.getLetterElement(this.#lettersContainer, letter, index) as HTMLElement
        element.className = this.#successClass
        element.remove()
        this.#answerContainer.appendChild(element)
    }

    #renderError(letter: string, index?: string): void {
        const letterEl = DOMTaskRender.getLetterElement(this.#lettersContainer, letter, index)

        if (letterEl) {
            clearTimeout(this.#errorTimer)

            letterEl.className = this.#errorClass
            this.#errorTimer = setTimeout(() => {
                letterEl.className = this.#primaryClass
            }, 150)
        }
    }

    #renderFailure(): void {
        clearTimeout(this.#errorTimer)

        const originWordArr = (this.#answerContainer.dataset.word as string).split('')
        const correctLetters = Array.from(this.#answerContainer.children)

        correctLetters.forEach(element => {
            element.className = this.#errorClass
            originWordArr.shift()
        })

        originWordArr.forEach(letter => {
            const element = DOMTaskRender.getLetterElement(this.#lettersContainer, letter) as HTMLElement
            element.className = this.#errorClass
            element.remove()
            this.#answerContainer.appendChild(element)
        })
    }

    static createLetter(letter: string, index: number, className: string): HTMLElement {
        const letterEl = document.createElement('button')
        letterEl.innerText = letter
        letterEl.className = className
        letterEl.dataset.letter = letter
        letterEl.dataset.index = String(index)

        return letterEl
    }

    static getLetterElement(container: HTMLElement, letter: string, index?: string): HTMLElement | null {
        return index
            ? container.querySelector(`[data-index="${index}"]`)
            : container.querySelector(`[data-letter="${letter}"]`)
    }
}