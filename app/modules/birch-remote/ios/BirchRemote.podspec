Pod::Spec.new do |s|
  s.name           = 'BirchRemote'
  s.version        = '1.0.0'
  s.summary        = 'Lock screen next/previous track commands for Birch'
  s.description    = 'Registers MPRemoteCommandCenter next/previous track handlers and forwards them to JS'
  s.author         = 'Birch'
  s.homepage       = 'https://github.com/birch/birch'
  s.license        = 'MIT'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.{h,m,mm,swift}'
end
