angular.module('particleApp', []).controller('ParticleController', function($scope) {
	var animationPanelName = "simulationPane";
	
    $scope.particleSlider = null;
	$scope.maxParticles = 500;
	 
    $scope.engine = null;
    $scope.activeParticles = 0;
    
    $scope.activeParticleTimeout = null;
    
   
    $scope.toggleWind  = function() {
        $scope.showWindVectors = !$scope.showWindVectors;
        $scope.engine.changeWindVectorDisplay($scope.showWindVectors);        
    };
	
	$scope.playSimulation = function() {
        $scope.engine.play();             
        $scope.startParticleCount();             
	};
    
	$scope.pauseSimulation = function() {
        $scope.engine.pause();             
        $scope.stopParticleCount();
	};
    $scope.stopParticleCount = function() {
        if($scope.activeParticleTimeout != null) {
            clearTimeout($scope.activeParticleTimeout);
            $scope.activeParticleTimeout = null;
        }
    };
    $scope.startParticleCount = function() {
        $scope.stopParticleCount();        
        $scope.activeParticleTimeout = setInterval(function() {
            $scope.activeParticles = $scope.engine.particles.length; 
            $scope.$apply();
        }, 200);  
    };
    $scope.playLeafEffect = function() {
        $scope.engine.setLeafAnimationActive();
	};
    
	$scope.playSnowEffect = function() {
        $scope.engine.setSnowAnimationActive();        
	};
    
    $scope.changeWind = function() {
        //Re-randomizes the wind speed/direction
        $scope.engine.changeWind();
    };
    $scope.clearPanel = function() {
        $scope.engine.resetParticles();
    }
    $scope.initialize = function() {
        
        //Initialize the particle engine in particleEngine.js
        $scope.engine = new ParticleEngine(animationPanelName, "svgLeaf", "svgSnowflake");
        $scope.engine.initialize();
         
        //Initialize the slider controlling particle count 
        $scope.particleSlider = $('#particleSlider').slider({
            min: 0,
            max: $scope.maxParticles, 
            value: $scope.engine.getNumberOfParticles()
        }).on('change', function(e) {
           if($scope.engine) {
               $scope.engine.setNumberOfParticles(e.value.newValue);
           }            
        });
        
        //Initialize the slider controlling wind speed
        $scope.windStrengthSlider = $('#windStrengthSlider').slider({
            min: 1,
            max: 99, 
            value: 100 - $scope.engine.getWindStrength()
        }).on('change', function(e) {
            if($scope.engine) {
               $scope.engine.setWindStrength(100 -  e.value.newValue);
           }
        });         
        
       
      
    }
  });