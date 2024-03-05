export abstract class ViewCommand {
	public abstract execute() : Promise<void>;
}