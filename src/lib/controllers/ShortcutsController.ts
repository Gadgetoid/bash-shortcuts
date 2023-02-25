import { PyInterop } from "../../PyInterop";
import { SteamController } from "./SteamController";

/**
 * Controller class for shortcuts.
 */
export class ShortcutsController {
  private steamController: SteamController;

  /**
   * Creates a new ShortcutsController.
   * @param steamController The SteamController used by this class.
   */
  constructor(steamController:SteamController) {
    this.steamController = steamController;
  }

  /**
   * Function to run when the plugin dismounts.
   */
  onDismount() {
    PyInterop.log("Dismounting...");
  }

  /**
   * Gets all of the current user's steam shortcuts.
   * @returns A promise resolving to a collection of the current user's steam shortcuts.
   */
  async getShortcuts(): Promise<SteamAppDetails[]> {
    const res = await this.steamController.getShortcuts();
    return res;
  }

  /**
   * Checks if a shortcut exists.
   * @param name The name of the shortcut to check for.
   * @returns A promise resolving to true if the shortcut was found.
   */
  async checkShortcutExist(name: string): Promise<boolean> {
    const shortcutsArr = await this.steamController.getShortcut(name) as SteamAppDetails[];
    return shortcutsArr[0]?.unAppID != 0;
  }
  
  /**
   * Checks if a shortcut exists.
   * @param appId The id of the shortcut to check for.
   * @returns A promise resolving to true if the shortcut was found.
   */
  async checkShortcutExistById(appId: number): Promise<boolean> {
    const shortcutsArr = await this.steamController.getShortcutById(appId) as SteamAppDetails[];
    return shortcutsArr[0]?.unAppID != 0;
  }

  /**
   * Sets the exe of a steam shortcut.
   * @param appId The id of the app to set.
   * @param exec The new value for the exe.
   * @returns A promise resolving to true if the exe was set successfully.
   */
  async setShortcutExe(appId: number, exec: string): Promise<boolean> {
    return await this.steamController.setShortcutExe(appId, exec);
  }

  /**
   * Sets the start dir of a steam shortcut.
   * @param appId The id of the app to set.
   * @param startDir The new value for the start dir.
   * @returns A promise resolving to true if the start dir was set successfully.
   */
  async setShortcutStartDir(appId: number, startDir: string): Promise<boolean> {
    return await this.steamController.setShortcutStartDir(appId, startDir);
  }

  /**
   * Sets the launch options of a steam shortcut.
   * @param appId The id of the app to set.
   * @param launchOpts The new value for the launch options.
   * @returns A promise resolving to true if the launch options was set successfully.
   */
  async setShortcutLaunchOptions(appId: number, launchOpts: string): Promise<boolean> {
    return await this.steamController.setAppLaunchOptions(appId, launchOpts);
  }

  /**
   * Launches a steam shortcut.
   * @param appId The id of the steam shortcut to launch.
   * @returns A promise resolving to true if the shortcut was successfully launched.
   */
  async launchShortcut(appId: number): Promise<boolean> {
    return await this.steamController.runGame(appId, false);
  }

  /**
   * Closes a running shortcut.
   * @param appId The id of the shortcut to close.
   * @returns A promise resolving to true if the shortcut was successfully closed.
   */
  async closeShortcut(appId: number): Promise<boolean> {
    return await this.steamController.terminateGame(appId);
  }

  /**
   * Creates a new steam shortcut.
   * @param name The name of the shortcut to create.
   * @param exec The executable file for the shortcut.
   * @returns A promise resolving to true if the shortcut was successfully created.
   */
  async addShortcut(name: string, exec: string): Promise<number | null> {
    const appId = await this.steamController.addShortcut(name, exec);
    if (appId) {
      return appId;
    } else {
      PyInterop.log(`Failed to add shortcut. Name: ${name}`);
      PyInterop.toast("Error", "Failed to add shortcut");
      return null;
    }
  }

  /**
   * Deletes a shortcut from steam.
   * @param name Name of the shortcut to delete.
   * @returns A promise resolving to true if the shortcut was successfully deleted.
   */
  async removeShortcut(name: string): Promise<boolean> {
    const shortcut = await this.steamController.getShortcut(name)[0] as SteamAppDetails;
    if (shortcut) {
      return await this.steamController.removeShortcut(shortcut.unAppID);
    } else {
      PyInterop.log(`Didn't find shortcut to remove. Name: ${name}`);
      PyInterop.toast("Error", "Didn't find shortcut to remove.");
      return false;
    }
  }

  /**
   * Deletes a shortcut from steam by id.
   * @param appId The id of the shortcut to delete.
   * @returns A promise resolving to true if the shortcut was successfully deleted.
   */
  async removeShortcutById(appId: number): Promise<boolean> {
    const res = await this.steamController.removeShortcut(appId);
    if (res) {
      return true;
    } else {
      PyInterop.log(`Failed to remove shortcut. AppId: ${appId}`);
      PyInterop.toast("Error", "Failed to remove shortcut");
      return false;
    }
  }
}