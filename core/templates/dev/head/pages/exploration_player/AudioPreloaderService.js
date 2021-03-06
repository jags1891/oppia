// Copyright 2017 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Service to preload audio into AssetsBackendApiService's cache.
 */

oppia.factory('AudioPreloaderService', [
  '$modal', 'explorationContextService', 'AssetsBackendApiService',
  'ExplorationPlayerStateService', 'UrlInterpolationService',
  'AudioTranslationManagerService',
  function($modal, explorationContextService, AssetsBackendApiService,
      ExplorationPlayerStateService, UrlInterpolationService,
      AudioTranslationManagerService) {
    // List of languages that have been preloaded in the exploration.
    var _preloadedLanguageCodes = [];

    var _preloadAllAudioFiles = function(languageCode) {
      var allAudioTranslations =
        ExplorationPlayerStateService
          .getExploration().getAllAudioTranslations(languageCode);

      allAudioTranslations.map(function(audioTranslation) {
        AssetsBackendApiService.loadAudio(
          explorationContextService.getExplorationId(),
          audioTranslation.filename);
      });

      _preloadedLanguageCodes.push(languageCode);
    };

    var _showBandwidthConfirmationModal = function(
        audioTranslationsForContent, languageCode,
        confirmationCallback) {
      $modal.open({
        templateUrl: UrlInterpolationService.getDirectiveTemplateUrl(
          '/pages/exploration_player/' +
          'audio_preload_bandwidth_confirmation_modal_directive.html'),
        resolve: {},
        backdrop: true,
        controller: [
          '$scope', '$modalInstance',
          'ExplorationPlayerStateService', 'AudioPreloaderService',
          'LanguageUtilService',
          function(
              $scope, $modalInstance,
              ExplorationPlayerStateService, AudioPreloaderService,
              LanguageUtilService) {
            $scope.fileSizeOfCurrentAudioTranslationMB =
              audioTranslationsForContent[languageCode]
                .getFileSizeMB().toPrecision(3);
            $scope.totalFileSizeOfAllAudioTranslationsMB =
              ExplorationPlayerStateService.getExploration()
                .getAllAudioTranslationsFileSizeMB(languageCode)
                .toPrecision(3);
            $scope.currentLanguageDescription =
              LanguageUtilService.getAudioLanguageDescription(languageCode);
            $scope.shouldDownloadAllAudioInExploration = false;

            $scope.confirm = function() {
              $modalInstance.close({
                shouldDownloadAllAudioInExploration: 
                  $scope.shouldDownloadAllAudioInExploration,
                shouldOpenSettingsModal: false
              });
            };

            $scope.cancel = function() {
              $modalInstance.dismiss('cancel');
            };

            $scope.chooseDifferentLanguage = function() {
              $modalInstance.close({
                shouldDownloadAllAudioInExploration: false,
                shouldOpenSettingsModal: true
              });
            };
          }]
      }).result.then(function(result) {
        if (result.shouldOpenSettingsModal) {
          // If the user elected to choose a different language, open
          // the settings modal (later can isolate to a language-only
          // modal), and on the callback re-open the bandwidth confirmation
          // modal if the file for the new language hasn't been loaded.
          AudioTranslationManagerService
            .showAudioTranslationSettingsModal(function(newLanguageCode) {
              var newAudioTranslation =
                audioTranslationsForContent[newLanguageCode];
              if (newAudioTranslation && !AssetsBackendApiService.isCached(
                newAudioTranslation.filename)) {
                _showBandwidthConfirmationModal(
                  audioTranslationsForContent, newLanguageCode,
                  confirmationCallback)
              }
            });
        } else {
          confirmationCallback(languageCode);
          if (result.shouldDownloadAllAudioInExploration) {
            _preloadAllAudioFiles(languageCode);
          }
        }
      });
    };

    return {
      init: function() {
        _init();
      },
      hasPreloadedLanguage: function(languageCode) {
        return _preloadedLanguageCodes.indexOf(languageCode) !== -1;
      },
      showBandwidthConfirmationModal: function(
          audioTranslationsForContent, languageCode,
          confirmationCallback) {
        _showBandwidthConfirmationModal(
          audioTranslationsForContent, languageCode,
          confirmationCallback);
      }
    };
  }
]);
