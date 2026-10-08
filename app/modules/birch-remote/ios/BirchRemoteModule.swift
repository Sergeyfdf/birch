import ExpoModulesCore
import MediaPlayer

public class BirchRemoteModule: Module {
  private var nextToken: Any?
  private var prevToken: Any?

  public func definition() -> ModuleDefinition {
    Name("BirchRemote")

    Events("onNext", "onPrevious")

    OnStartObserving {
      DispatchQueue.main.async { self.attach() }
    }

    OnStopObserving {
      DispatchQueue.main.async { self.detach() }
    }

    Function("setEnabled") { (next: Bool, previous: Bool) in
      DispatchQueue.main.async {
        let center = MPRemoteCommandCenter.shared()
        center.nextTrackCommand.isEnabled = next
        center.previousTrackCommand.isEnabled = previous
      }
    }

    OnDestroy {
      DispatchQueue.main.async { self.detach() }
    }
  }

  private func attach() {
    let center = MPRemoteCommandCenter.shared()
    if nextToken == nil {
      nextToken = center.nextTrackCommand.addTarget { [weak self] _ in
        self?.sendEvent("onNext", [:])
        return .success
      }
    }
    if prevToken == nil {
      prevToken = center.previousTrackCommand.addTarget { [weak self] _ in
        self?.sendEvent("onPrevious", [:])
        return .success
      }
    }
    center.nextTrackCommand.isEnabled = true
    center.previousTrackCommand.isEnabled = true
  }

  private func detach() {
    let center = MPRemoteCommandCenter.shared()
    if let t = nextToken {
      center.nextTrackCommand.removeTarget(t)
      nextToken = nil
    }
    if let t = prevToken {
      center.previousTrackCommand.removeTarget(t)
      prevToken = nil
    }
  }
}
