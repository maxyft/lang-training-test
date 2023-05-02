export interface ITrainingState {
    maxErrCount: number
    maxTaskCount: number
    currentTaskIndex: number
    tasks: Array<ITask>
}

export interface ITask {
    word: string
    randomizedWord: string
    wordProgress: string
    currentLetterIndex: number
    currentErrCount: number
    maxErrorCount: number
}

export interface ITrainingClass extends ITrainingState {
    tasks: Array<ITaskClass>
    randomizeTasks(): Array<ITaskClass>
    restoreState(state: ITrainingState): void
    handleInput(letter: string): IResult
    get errorCount(): number
    get tasksWithoutErrors(): number
    get mostBrokenTask(): string
    get currentTask(): ITaskClass
    get isComplete(): boolean
}

export interface ITaskClass extends ITask {
    randomize(word: string): void
    handleLetter(letter: string): boolean
    incrementProgress(letter: string): void
    setError(): void
    get currentLetterSymbol (): string
    get isComplete(): boolean
    get isError(): boolean
}

export interface IResult {
    success: boolean
    taskComplete: boolean
    taskError: boolean
    trainingComplete: boolean
}

export interface IDOMRenderClass {
    isPending: boolean
    renderTraining (training: ITrainingClass, taskIndex?: number): void
    handleChange (training: ITrainingClass, changeResult: IResult, letter: string, index?: string): void
    renderStats (training: ITrainingClass): void
}

