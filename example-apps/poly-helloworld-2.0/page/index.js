import AutoGUI from "@silver-zepp/autogui";
import { Polyglot } from "@silver-zepp/polyglot";

const gui = new AutoGUI();
const poly = new Polyglot();


function example_MiniApp() {
  // helper to update all texts based on the current language
  function updateTexts() {
    text_title.update({ text: poly.getText("polyglot").toUpperCase(), color: 0xff0000 });
    text_header.update({ text: poly.getText("header") + "\n" + poly.getText("polyglot") + "!" });
    btn_left.update({ text: poly.getText("btn_left") + "\n " });
    btn_right.update({ text: poly.getText("btn_right") + "\n " });
  }

  gui.startGroup();
    gui.fillRect(0x222222);
    const text_title = gui.text(poly.getText("polyglot").toUpperCase(), { color: 0xff0000 });
  gui.endGroup();

  gui.newRow(); // -------------------------------------------

  // concatenate multiple polyglot key strings
  const text_header = gui.text(poly.getText("header") + "\n" + poly.getText("polyglot") + "!");

  gui.newRow(); // -------------------------------------------

  const btn_left = gui.button(poly.getText("btn_left") + "\n ");
  const btn_right = gui.button(poly.getText("btn_right") + "\n ");

  // register a listener for language change events
  poly.onLanguageChange(() => {
    // update texts when language changes
    updateTexts();
  });

  // render the GUI
  gui.render();

  // show the language switcher icon (keep this as the last GUI call)
  poly.showPolyBubble();
}



Page({
  build() {
    AutoGUI.SetColor(0x333333);
    example_MiniApp();
  }
});



/** Alternative example for default widgets:
 * text_title.setProperty(prop.TEXT, texts["weather"]);
 */